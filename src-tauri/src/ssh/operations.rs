// ── SSH SFTP Plan Operations ────────────────────────────────

use russh_sftp::protocol::OpenFlags;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::plan::{self, Comment, CommentData, Plan, PlanInfo};
use crate::ssh::config;
use crate::ssh::connection::SshConnectionManager;

/// 解析远程 .claude 路径（展开 ~ 为实际Home 目录）
fn resolve_remote_path(remote_claude_dir: &str, home_dir: &str, sub: &str) -> String {
    let base = if remote_claude_dir.starts_with('~') {
        remote_claude_dir.replacen('~', home_dir, 1)
    } else {
        remote_claude_dir.to_string()
    };
    format!("{}/{}", base.trim_end_matches('/'), sub)
}

/// 列出远程 plan 文件（带自动重连）
pub async fn list_plans_ssh(
    mgr: &SshConnectionManager,
    config_id: &str,
) -> Result<Vec<PlanInfo>, String> {
    match list_plans_ssh_inner(mgr, config_id).await {
        Ok(v) => Ok(v),
        Err(e) => {
            // 连接可能已断开，尝试重连一次
            let _ = mgr.disconnect(config_id).await;
            list_plans_ssh_inner(mgr, config_id)
                .await
                .map_err(|retry_err| format!("{} (重试后仍失败: {})", e, retry_err))
        }
    }
}

async fn list_plans_ssh_inner(
    mgr: &SshConnectionManager,
    config_id: &str,
) -> Result<Vec<PlanInfo>, String> {
    let cfg = config::get_ssh_config(config_id)?
        .ok_or_else(|| format!("SSH 配置 {} 不存在", config_id))?;

    // 确保已连接
    mgr.get_or_connect(&cfg).await?;

    let home_dir = mgr.get_home_dir(config_id).await?;
    let plans_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plans");

    let conns = mgr.connections_lock().await;
    let conn = conns
        .get(config_id)
        .ok_or_else(|| "连接已断开".to_string())?;

    let entries = conn
        .sftp
        .read_dir(&plans_dir)
        .await
        .map_err(|e| format!("读取远程 plans 目录失败: {}", e))?;

    let mut plans = Vec::new();
    for entry in entries {
        let name = entry.file_name();
        if !name.ends_with(".md") {
            continue;
        }
        let plan_id = name.trim_end_matches(".md").to_string();

        // 获取文件属性
        let file_path = format!("{}/{}", plans_dir, name);
        let attrs = conn.sftp.metadata(&file_path).await.ok();

        let modified = attrs
            .as_ref()
            .and_then(|a| a.mtime)
            .map(|t| {
                chrono::DateTime::<chrono::Utc>::from_timestamp(t as i64, 0)
                    .unwrap_or_default()
                    .to_rfc3339()
            })
            .unwrap_or_default();

        let size = attrs.as_ref().and_then(|a| a.size).unwrap_or(0);

        // 远程评论计数：尝试读取 comments sidecar
        let comments_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plan-reviews");
        let comments_file = format!("{}/{}", comments_dir, name.replace(".md", ".comments.json"));
        let comment_count = read_remote_comment_count(&conn.sftp, &comments_file).await;

        plans.push(PlanInfo {
            id: plan_id,
            name,
            path: file_path,
            modified,
            size,
            comment_count,
            source: format!("ssh:{}", config_id),
        });
    }

    // Sort by modified date, newest first
    plans.sort_by(|a, b| b.modified.cmp(&a.modified));
    Ok(plans)
}

/// 获取远程 plan 详情（带自动重连）
pub async fn get_plan_ssh(
    mgr: &SshConnectionManager,
    config_id: &str,
    plan_id: &str,
) -> Result<Option<Plan>, String> {
    match get_plan_ssh_inner(mgr, config_id, plan_id).await {
        Ok(v) => Ok(v),
        Err(e) => {
            let _ = mgr.disconnect(config_id).await;
            get_plan_ssh_inner(mgr, config_id, plan_id)
                .await
                .map_err(|retry_err| format!("{} (重试后仍失败: {})", e, retry_err))
        }
    }
}

async fn get_plan_ssh_inner(
    mgr: &SshConnectionManager,
    config_id: &str,
    plan_id: &str,
) -> Result<Option<Plan>, String> {
    let cfg = config::get_ssh_config(config_id)?
        .ok_or_else(|| format!("SSH 配置 {} 不存在", config_id))?;

    mgr.get_or_connect(&cfg).await?;

    let home_dir = mgr.get_home_dir(config_id).await?;
    let plans_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plans");
    let file_path = format!("{}/{}.md", plans_dir, plan_id);

    let conns = mgr.connections_lock().await;
    let conn = conns
        .get(config_id)
        .ok_or_else(|| "连接已断开".to_string())?;

    // 读取文件内容
    let content = match read_remote_file(&conn.sftp, &file_path).await {
        Ok(c) => c,
        Err(_) => return Ok(None),
    };

    // 获取文件属性
    let attrs = conn.sftp.metadata(&file_path).await.ok();
    let modified = attrs
        .as_ref()
        .and_then(|a| a.mtime)
        .map(|t| {
            chrono::DateTime::<chrono::Utc>::from_timestamp(t as i64, 0)
                .unwrap_or_default()
                .to_rfc3339()
        })
        .unwrap_or_default();

    // 读取 comments sidecar
    let comments_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plan-reviews");
    let comments_file = format!("{}/{}.comments.json", comments_dir, plan_id);
    let comments = read_remote_comments(&conn.sftp, &comments_file).await;

    Ok(Some(Plan {
        id: plan_id.to_string(),
        name: format!("{}.md", plan_id),
        path: file_path,
        content,
        modified,
        comments,
    }))
}

/// 读取远程文件内容
async fn read_remote_file(
    sftp: &russh_sftp::client::SftpSession,
    path: &str,
) -> Result<String, String> {
    let mut file = sftp
        .open_with_flags(path, OpenFlags::READ)
        .await
        .map_err(|e| format!("打开远程文件失败 {}: {}", path, e))?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .await
        .map_err(|e| format!("读取远程文件失败 {}: {}", path, e))?;

    Ok(content)
}

/// 读取远程评论 sidecar 文件
async fn read_remote_comments(sftp: &russh_sftp::client::SftpSession, path: &str) -> Vec<Comment> {
    match read_remote_file(sftp, path).await {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

/// 读取远程评论计数
async fn read_remote_comment_count(sftp: &russh_sftp::client::SftpSession, path: &str) -> usize {
    match read_remote_file(sftp, path).await {
        Ok(content) => serde_json::from_str::<Vec<serde_json::Value>>(&content)
            .map(|v| v.len())
            .unwrap_or(0),
        Err(_) => 0,
    }
}

/// 写入远程文件内容（覆盖）
async fn write_remote_file(
    sftp: &russh_sftp::client::SftpSession,
    path: &str,
    content: &str,
) -> Result<(), String> {
    let mut file = sftp
        .open_with_flags(
            path,
            OpenFlags::CREATE | OpenFlags::TRUNCATE | OpenFlags::WRITE,
        )
        .await
        .map_err(|e| format!("打开远程文件写入失败 {}: {}", path, e))?;

    file.write_all(content.as_bytes())
        .await
        .map_err(|e| format!("写入远程文件失败 {}: {}", path, e))?;

    file.flush()
        .await
        .map_err(|e| format!("刷新远程文件失败 {}: {}", path, e))?;

    Ok(())
}

/// 写入远程评论 sidecar JSON
async fn write_remote_comments(
    sftp: &russh_sftp::client::SftpSession,
    path: &str,
    comments: &[Comment],
) -> Result<(), String> {
    let json =
        serde_json::to_string_pretty(comments).map_err(|e| format!("序列化评论失败: {}", e))?;
    write_remote_file(sftp, path, &json).await
}

/// 确保远程目录存在
async fn ensure_remote_dir(sftp: &russh_sftp::client::SftpSession, path: &str) {
    // 尝试创建目录，忽略已存在的错误
    let _ = sftp.create_dir(path).await;
}

/// 添加远程评论
pub async fn add_comment_ssh(
    mgr: &SshConnectionManager,
    config_id: &str,
    plan_id: &str,
    comment_data: CommentData,
) -> Result<Comment, String> {
    let cfg = config::get_ssh_config(config_id)?
        .ok_or_else(|| format!("SSH 配置 {} 不存在", config_id))?;

    mgr.get_or_connect(&cfg).await?;

    let home_dir = mgr.get_home_dir(config_id).await?;
    let plans_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plans");
    let comments_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plan-reviews");
    let plan_file = format!("{}/{}.md", plans_dir, plan_id);
    let comments_file = format!("{}/{}.comments.json", comments_dir, plan_id);

    let conns = mgr.connections_lock().await;
    let conn = conns
        .get(config_id)
        .ok_or_else(|| "连接已断开".to_string())?;

    // 读取现有评论
    let mut comments = read_remote_comments(&conn.sftp, &comments_file).await;

    // 创建新评论
    let now = chrono::Utc::now().to_rfc3339();
    let new_comment = Comment {
        id: format!("comment-{}", uuid::Uuid::new_v4()),
        plan_id: plan_id.to_string(),
        line_number: None,
        line_content: String::new(),
        section_title: comment_data.section_title,
        selected_text: comment_data.selected_text,
        text: comment_data.text,
        comment_type: comment_data.comment_type,
        status: "pending".to_string(),
        created_at: now,
    };

    // 保存评论到 sidecar JSON
    comments.push(new_comment.clone());
    ensure_remote_dir(&conn.sftp, &comments_dir).await;
    write_remote_comments(&conn.sftp, &comments_file, &comments).await?;

    // 注入评论到 plan 文件
    let content = read_remote_file(&conn.sftp, &plan_file)
        .await
        .map_err(|e| format!("读取远程 plan 文件失败: {}", e))?;
    let new_content = plan::inject_comment_into_content(&content, &new_comment);
    write_remote_file(&conn.sftp, &plan_file, &new_content).await?;

    Ok(new_comment)
}

/// 删除远程评论
pub async fn delete_comment_ssh(
    mgr: &SshConnectionManager,
    config_id: &str,
    plan_id: &str,
    comment_id: &str,
) -> Result<bool, String> {
    let cfg = config::get_ssh_config(config_id)?
        .ok_or_else(|| format!("SSH 配置 {} 不存在", config_id))?;

    mgr.get_or_connect(&cfg).await?;

    let home_dir = mgr.get_home_dir(config_id).await?;
    let plans_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plans");
    let comments_dir = resolve_remote_path(&cfg.remote_claude_dir, &home_dir, "plan-reviews");
    let plan_file = format!("{}/{}.md", plans_dir, plan_id);
    let comments_file = format!("{}/{}.comments.json", comments_dir, plan_id);

    let conns = mgr.connections_lock().await;
    let conn = conns
        .get(config_id)
        .ok_or_else(|| "连接已断开".to_string())?;

    // 读取现有评论
    let comments = read_remote_comments(&conn.sftp, &comments_file).await;

    // 找到目标评论
    let target = comments.iter().find(|c| c.id == comment_id).cloned();

    if let Some(target) = target {
        // 从列表中移除
        let filtered: Vec<Comment> = comments
            .into_iter()
            .filter(|c| c.id != comment_id)
            .collect();

        write_remote_comments(&conn.sftp, &comments_file, &filtered).await?;

        // 从 plan 文件中移除评论块
        let content = read_remote_file(&conn.sftp, &plan_file)
            .await
            .map_err(|e| format!("读取远程 plan 文件失败: {}", e))?;
        let new_content = plan::remove_comment_from_content(&content, &target);
        if new_content != content {
            write_remote_file(&conn.sftp, &plan_file, &new_content).await?;
        }
    }

    Ok(true)
}
