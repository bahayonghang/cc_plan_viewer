// ── SSH Connection Manager ───────────────────────────────────

use std::collections::HashMap;
use std::sync::Arc;

use russh::client;
use russh::ChannelMsg;
use russh_sftp::client::SftpSession;
use tokio::sync::Mutex;

use crate::ssh::config::{SshAuthMethod, SshHostConfig};

/// SSH 客户端 Handler
pub(crate) struct SshClient;

impl client::Handler for SshClient {
    type Error = anyhow::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::PublicKey,
    ) -> Result<bool, Self::Error> {
        // 接受所有服务器密钥（桌面应用场景可接受）
        Ok(true)
    }
}

/// 活跃的 SSH 连接
pub struct SshConnection {
    pub session: client::Handle<SshClient>,
    pub sftp: SftpSession,
    pub home_dir: String,
}

/// SSH 连接管理器（Tauri 托管状态）
pub struct SshConnectionManager {
    connections: Mutex<HashMap<String, SshConnection>>,
}

impl SshConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }

    /// 获取或建立连接
    pub async fn get_or_connect(&self, config: &SshHostConfig) -> Result<(), String> {
        let conns = self.connections.lock().await;
        if conns.contains_key(&config.id) {
            return Ok(());
        }
        drop(conns);

        let conn = Self::connect(config).await?;
        let mut conns = self.connections.lock().await;
        conns.insert(config.id.clone(), conn);
        Ok(())
    }

    /// 建立新连接
    async fn connect(config: &SshHostConfig) -> Result<SshConnection, String> {
        let ssh_config = russh::client::Config::default();
        let handler = SshClient;

        let mut session = russh::client::connect(
            Arc::new(ssh_config),
            (config.host.as_str(), config.port),
            handler,
        )
        .await
        .map_err(|e| format!("SSH 连接失败: {}", e))?;

        // 认证
        match &config.auth_method {
            SshAuthMethod::Password { password } => {
                let auth_ok = session
                    .authenticate_password(&config.username, password)
                    .await
                    .map_err(|e| format!("密码认证失败: {}", e))?;
                if !auth_ok.success() {
                    return Err("密码认证被拒绝".to_string());
                }
            }
            SshAuthMethod::Key {
                private_key_path,
                passphrase,
            } => {
                let key_path = shellexpand_path(private_key_path);
                let key = russh::keys::load_secret_key(&key_path, passphrase.as_deref())
                    .map_err(|e| format!("加载私钥失败: {}", e))?;
                let auth_ok = session
                    .authenticate_publickey(
                        &config.username,
                        russh::keys::PrivateKeyWithHashAlg::new(Arc::new(key), None),
                    )
                    .await
                    .map_err(|e| format!("密钥认证失败: {}", e))?;
                if !auth_ok.success() {
                    return Err("密钥认证被拒绝".to_string());
                }
            }
        }

        // 获取远程Home 目录
        let home_dir = execute_remote_command(&session, "echo $HOME")
            .await
            .map_err(|e| format!("获取远程Home 目录失败: {}", e))?
            .trim()
            .to_string();

        if home_dir.is_empty() {
            return Err("无法获取远程Home 目录".to_string());
        }

        // 打开 SFTP 子系统
        let channel = session
            .channel_open_session()
            .await
            .map_err(|e| format!("打开 SFTP 通道失败: {}", e))?;
        channel
            .request_subsystem(true, "sftp")
            .await
            .map_err(|e| format!("请求 SFTP 子系统失败: {}", e))?;
        let sftp = SftpSession::new(channel.into_stream())
            .await
            .map_err(|e| format!("初始化 SFTP 会话失败: {}", e))?;

        Ok(SshConnection {
            session,
            sftp,
            home_dir,
        })
    }

    /// 获取连接的Home 目录
    pub async fn get_home_dir(&self, config_id: &str) -> Result<String, String> {
        let conns = self.connections.lock().await;
        let conn = conns
            .get(config_id)
            .ok_or_else(|| format!("SSH 连接 {} 不存在", config_id))?;
        Ok(conn.home_dir.clone())
    }

    /// 获取连接 map 的锁（供 operations 模块使用）
    pub async fn connections_lock(
        &self,
    ) -> tokio::sync::MutexGuard<'_, HashMap<String, SshConnection>> {
        self.connections.lock().await
    }

    /// 断开单个连接
    pub async fn disconnect(&self, config_id: &str) -> Result<(), String> {
        let mut conns = self.connections.lock().await;
        if let Some(conn) = conns.remove(config_id) {
            let _ = conn
                .session
                .disconnect(russh::Disconnect::ByApplication, "User disconnect", "")
                .await;
        }
        Ok(())
    }

    /// 断开所有连接（应用退出时调用）
    #[allow(dead_code)]
    pub async fn disconnect_all(&self) {
        let mut conns = self.connections.lock().await;
        for (_, conn) in conns.drain() {
            let _ = conn
                .session
                .disconnect(russh::Disconnect::ByApplication, "Application exit", "")
                .await;
        }
    }

    /// 检查连接状态
    pub async fn is_connected(&self, config_id: &str) -> bool {
        let conns = self.connections.lock().await;
        conns.contains_key(config_id)
    }
}

/// 在远程服务器上执行命令并返回 stdout 输出
async fn execute_remote_command(
    session: &client::Handle<SshClient>,
    command: &str,
) -> Result<String, anyhow::Error> {
    let mut channel = session.channel_open_session().await?;
    channel.exec(true, command).await?;

    let mut output = Vec::new();
    loop {
        let Some(msg) = channel.wait().await else {
            break;
        };
        if let ChannelMsg::Data { ref data } = msg {
            output.extend_from_slice(data);
        }
    }

    Ok(String::from_utf8_lossy(&output).to_string())
}

/// 展开路径中的 ~ 为实际Home 目录
fn shellexpand_path(path: &str) -> String {
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = dirs::home_dir() {
            return path.replacen('~', &home.to_string_lossy(), 1);
        }
    }
    path.to_string()
}
