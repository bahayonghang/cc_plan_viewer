// ── Plan Source ──────────────────────────────────────────────

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

/// 计划文件来源：Windows 本地、WSL 发行版或 SSH 远程主机
#[derive(Debug, Clone)]
pub enum PlanSource {
    Windows,
    Wsl(String), // 发行版名称
    Ssh(String), // SSH 配置 ID
}

impl PlanSource {
    pub fn from_opt(s: Option<&str>) -> Self {
        match s {
            Some(v) if v.starts_with("wsl:") => PlanSource::Wsl(v[4..].to_string()),
            Some(v) if v.starts_with("ssh:") => PlanSource::Ssh(v[4..].to_string()),
            _ => PlanSource::Windows,
        }
    }
}

/// WSL 检测结果
#[derive(Debug, Serialize, Deserialize)]
pub struct WslInfo {
    pub available: bool,
    pub distributions: Vec<String>,
}

// ── Configuration ────────────────────────────────────────────

pub fn get_claude_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Failed to get home directory")
        .join(".claude")
}

/// 按来源解析 .claude 目录路径
pub fn get_claude_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    match source {
        PlanSource::Windows => Ok(dirs::home_dir()
            .ok_or("无法获取 Home 目录")?
            .join(".claude")),
        PlanSource::Wsl(distro) => get_wsl_claude_dir(distro),
        PlanSource::Ssh(_) => Err("SSH 来源不支持本地路径解析，请使用 SFTP 操作".to_string()),
    }
}

/// 通过 wsl.exe 获取 WSL 发行版中的 ~/.claude 路径，转为 UNC 路径
fn get_wsl_claude_dir(distro: &str) -> Result<PathBuf, String> {
    let output = Command::new("wsl.exe")
        .args(["-d", distro, "-e", "sh", "-c", "echo $HOME"])
        .output()
        .map_err(|e| format!("wsl.exe 执行失败: {}", e))?;
    let home = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if home.is_empty() {
        return Err(format!("无法获取 {} 的 Home 目录", distro));
    }
    // 转换为 Windows UNC 路径: \\wsl$\<distro>/home/user/.claude
    let unc = format!(r"\\wsl$\{}{}", distro, home.replace('/', "\\"));
    Ok(PathBuf::from(unc).join(".claude"))
}

pub fn get_plans_dir() -> PathBuf {
    get_claude_dir().join("plans")
}

pub fn get_comments_dir() -> PathBuf {
    get_claude_dir().join("plan-reviews")
}

pub fn get_plans_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    Ok(get_claude_dir_for(source)?.join("plans"))
}

pub fn get_comments_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    Ok(get_claude_dir_for(source)?.join("plan-reviews"))
}
