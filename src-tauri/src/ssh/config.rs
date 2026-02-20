// ── SSH Configuration Management ────────────────────────────

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// SSH 认证方式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SshAuthMethod {
    Key {
        private_key_path: String,
        passphrase: Option<String>,
    },
    Password {
        password: String,
    },
}

/// SSH 主机配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshHostConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_method: SshAuthMethod,
    pub remote_claude_dir: String,
    pub created_at: String,
    pub last_connected: Option<String>,
}

/// 获取 SSH 配置存储路径: ~/.claude/plan-viewer/ssh-configs.json
fn ssh_configs_path() -> Result<PathBuf, String> {
    let dir = dirs::home_dir()
        .ok_or("无法获取 Home 目录")?
        .join(".claude")
        .join("plan-viewer");
    Ok(dir.join("ssh-configs.json"))
}

/// 加载所有 SSH 配置
pub fn load_ssh_configs() -> Result<Vec<SshHostConfig>, String> {
    let path = ssh_configs_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("读取 SSH 配置失败: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("解析 SSH 配置失败: {}", e))
}

/// 保存所有 SSH 配置
fn save_all_configs(configs: &[SshHostConfig]) -> Result<(), String> {
    let path = ssh_configs_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    let json =
        serde_json::to_string_pretty(configs).map_err(|e| format!("序列化 SSH 配置失败: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("写入 SSH 配置失败: {}", e))
}

/// 保存（新增或更新）单个 SSH 配置
pub fn save_ssh_config(mut config: SshHostConfig) -> Result<SshHostConfig, String> {
    let mut configs = load_ssh_configs()?;

    if config.id.is_empty() {
        // 新建
        config.id = Uuid::new_v4().to_string();
        config.created_at = chrono::Utc::now().to_rfc3339();
        configs.push(config.clone());
    } else {
        // 更新
        if let Some(existing) = configs.iter_mut().find(|c| c.id == config.id) {
            existing.name = config.name.clone();
            existing.host = config.host.clone();
            existing.port = config.port;
            existing.username = config.username.clone();
            existing.auth_method = config.auth_method.clone();
            existing.remote_claude_dir = config.remote_claude_dir.clone();
        } else {
            return Err(format!("SSH 配置 {} 不存在", config.id));
        }
    }

    save_all_configs(&configs)?;
    Ok(config)
}

/// 删除 SSH 配置
pub fn delete_ssh_config(config_id: &str) -> Result<bool, String> {
    let mut configs = load_ssh_configs()?;
    let original_len = configs.len();
    configs.retain(|c| c.id != config_id);

    if configs.len() == original_len {
        return Ok(false);
    }

    save_all_configs(&configs)?;
    Ok(true)
}

/// 按 ID 获取配置
pub fn get_ssh_config(config_id: &str) -> Result<Option<SshHostConfig>, String> {
    let configs = load_ssh_configs()?;
    Ok(configs.into_iter().find(|c| c.id == config_id))
}
