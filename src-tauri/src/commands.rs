// ── Tauri Commands ──────────────────────────────────────────

use crate::cache::PlanListCache;
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
    cache: State<'_, PlanListCache>,
) -> Result<Vec<PlanInfo>, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => operations::list_plans_ssh(&ssh_mgr, id).await,
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;
            let cache_key = plans_dir.to_string_lossy().to_string();

            // 检查目录修改时间用于缓存验证
            let dir_mtime = std::fs::metadata(&plans_dir)
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);

            // 尝试命中缓存
            if let Some(cached) = cache.get_if_valid(&cache_key, dir_mtime) {
                return Ok(cached);
            }

            // 缓存未命中，从磁盘读取（使用 spawn_blocking 避免阻塞异步运行时）
            let plans_dir_clone = plans_dir.clone();
            let comments_dir_clone = comments_dir.clone();
            let plans = tokio::task::spawn_blocking(move || {
                plan::list_plans(&plans_dir_clone, &comments_dir_clone)
            })
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?;

            // 更新缓存
            cache.update(&cache_key, plans.clone(), dir_mtime);

            Ok(plans)
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
            tokio::task::spawn_blocking(move || plan::get_plan(&plan_id, &plans_dir, &comments_dir))
                .await
                .map_err(|e| format!("任务执行失败: {}", e))
        }
    }
}

#[tauri::command]
pub async fn add_comment_command(
    plan_id: String,
    comment_data: CommentData,
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
    cache: State<'_, PlanListCache>,
) -> Result<Comment, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => {
            operations::add_comment_ssh(&ssh_mgr, id, &plan_id, comment_data).await
        }
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;

            // 使缓存失效（评论数变化）
            let cache_key = plans_dir.to_string_lossy().to_string();
            cache.invalidate(&cache_key);

            tokio::task::spawn_blocking(move || {
                plan::add_comment(&plan_id, comment_data, &plans_dir, &comments_dir)
            })
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
        }
    }
}

#[tauri::command]
pub async fn delete_comment_command(
    plan_id: String,
    comment_id: String,
    source: Option<String>,
    ssh_mgr: State<'_, SshConnectionManager>,
    cache: State<'_, PlanListCache>,
) -> Result<bool, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    match ps {
        PlanSource::Ssh(ref id) => {
            operations::delete_comment_ssh(&ssh_mgr, id, &plan_id, &comment_id).await
        }
        _ => {
            let plans_dir = source::get_plans_dir_for(&ps)?;
            let comments_dir = source::get_comments_dir_for(&ps)?;

            // 使缓存失效
            let cache_key = plans_dir.to_string_lossy().to_string();
            cache.invalidate(&cache_key);

            tokio::task::spawn_blocking(move || {
                plan::delete_comment(&plan_id, &comment_id, &plans_dir, &comments_dir)
            })
            .await
            .map_err(|e| format!("任务执行失败: {}", e))?
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
    tokio::task::spawn_blocking(|| {
        let css_path = crate::source::get_claude_dir()
            .join("plan-viewer")
            .join("custom.css");
        if !css_path.exists() {
            return Ok(None);
        }
        std::fs::read_to_string(&css_path)
            .map(Some)
            .map_err(|e| format!("读取自定义样式失败: {}", e))
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

#[tauri::command]
pub async fn save_custom_css(css: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let dir = crate::source::get_claude_dir().join("plan-viewer");
        std::fs::create_dir_all(&dir).map_err(|e| format!("创建目录失败: {}", e))?;
        std::fs::write(dir.join("custom.css"), css)
            .map_err(|e| format!("保存自定义样式失败: {}", e))
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}
