// ── Tauri Commands ──────────────────────────────────────────

use crate::plan::{self, Comment, CommentData, Plan, PlanInfo};
use crate::source::{self, PlanSource, WslInfo};
use crate::ssh::config::{self, SshHostConfig};
use crate::ssh::connection::SshConnectionManager;
use crate::ssh::operations;
use crate::wsl;
use serde::Serialize;
use tauri::State;

#[tauri::command]
pub async fn detect_wsl() -> Result<WslInfo, String> {
    if cfg!(target_os = "windows") {
        let distributions = wsl::list_wsl_distributions();
        Ok(WslInfo {
            available: !distributions.is_empty(),
            distributions,
        })
    } else {
        Ok(WslInfo {
            available: false,
            distributions: vec![],
        })
    }
}

#[tauri::command]
pub async fn get_plans(
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<Vec<PlanInfo>, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => operations::list_plans_ssh(&ssh_mgr, id).await,
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;
            Ok(plan::list_plans(&plans_dir, &comments_dir))
        }
    }
}

#[tauri::command]
pub async fn get_plan_by_id(
    plan_id: String,
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<Option<Plan>, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => operations::get_plan_ssh(&ssh_mgr, id, &plan_id).await,
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;
            Ok(plan::get_plan(&plan_id, &plans_dir, &comments_dir))
        }
    }
}

#[tauri::command]
pub async fn add_comment_command(
    plan_id: String,
    comment_data: CommentData,
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<Comment, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => {
            operations::add_comment_ssh(&ssh_mgr, id, &plan_id, comment_data).await
        }
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;
            plan::add_comment(&plan_id, comment_data, &plans_dir, &comments_dir)
        }
    }
}

#[tauri::command]
pub async fn delete_comment_command(
    plan_id: String,
    comment_id: String,
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<bool, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => {
            operations::delete_comment_ssh(&ssh_mgr, id, &plan_id, &comment_id).await
        }
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;
            plan::delete_comment(&plan_id, &comment_id, &plans_dir, &comments_dir)
        }
    }
}

// ── SSH Configuration Commands ──────────────────────────────

#[tauri::command]
pub async fn get_ssh_configs() -> Result<Vec<SshHostConfig>, String> {
    config::load_ssh_configs()
}

#[tauri::command]
pub async fn save_ssh_config_command(config_data: SshHostConfig) -> Result<SshHostConfig, String> {
    config::save_ssh_config(config_data)
}

#[tauri::command]
pub async fn delete_ssh_config_command(config_id: String) -> Result<bool, String> {
    config::delete_ssh_config(&config_id)
}

// ── SSH Connection Commands ─────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SshTestResult {
    pub success: bool,
    pub message: String,
    pub home_dir: Option<String>,
}

#[tauri::command]
pub async fn test_ssh_connection(
    config_data: SshHostConfig,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<SshTestResult, String> {
    match ssh_mgr.get_or_connect(&config_data).await {
        Ok(()) => {
            let home_dir = ssh_mgr.get_home_dir(&config_data.id).await.ok();
            Ok(SshTestResult {
                success: true,
                message: format!(
                    "连接成功！Home 目录: {}",
                    home_dir.as_deref().unwrap_or("未知")
                ),
                home_dir,
            })
        }
        Err(e) => {
            // 连接失败时清理
            let _ = ssh_mgr.disconnect(&config_data.id).await;
            Ok(SshTestResult {
                success: false,
                message: e,
                home_dir: None,
            })
        }
    }
}

#[tauri::command]
pub async fn disconnect_ssh(
    config_id: String,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<(), String> {
    ssh_mgr.disconnect(&config_id).await
}

#[tauri::command]
pub async fn get_ssh_connection_status(
    config_id: String,
    ssh_mgr: State<'_, SshConnectionManager>,
) -> Result<bool, String> {
    Ok(ssh_mgr.is_connected(&config_id).await)
}

// ── 自定义样式 Commands ─────────────────────────────────────

#[tauri::command]
pub async fn get_custom_css() -> Result<Option<String>, String> {
    let css_path = crate::source::get_claude_dir()
        .join("plan-viewer")
        .join("custom.css");
    if !css_path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(&css_path)
        .map(Some)
        .map_err(|e| format!("读取自定义样式失败: {}", e))
}
