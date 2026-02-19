// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use uuid::Uuid;

// ── Plan Source ──────────────────────────────────────────────

/// 计划文件来源：Windows 本地或 WSL 发行版
#[derive(Debug, Clone)]
enum PlanSource {
    Windows,
    Wsl(String), // 发行版名称
}

impl PlanSource {
    fn from_opt(s: Option<&str>) -> Self {
        match s {
            Some(v) if v.starts_with("wsl:") => PlanSource::Wsl(v[4..].to_string()),
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

fn get_claude_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Failed to get home directory")
        .join(".claude")
}

/// 按来源解析 .claude 目录路径
fn get_claude_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    match source {
        PlanSource::Windows => Ok(dirs::home_dir().ok_or("无法获取家目录")?.join(".claude")),
        PlanSource::Wsl(distro) => get_wsl_claude_dir(distro),
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
        return Err(format!("无法获取 {} 的家目录", distro));
    }
    // 转换为 Windows UNC 路径: \\wsl$\<distro>/home/user/.claude
    let unc = format!(r"\\wsl$\{}{}", distro, home.replace('/', "\\"));
    Ok(PathBuf::from(unc).join(".claude"))
}

fn get_plans_dir() -> PathBuf {
    get_claude_dir().join("plans")
}

fn get_comments_dir() -> PathBuf {
    get_claude_dir().join("plan-reviews")
}

fn get_plans_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    Ok(get_claude_dir_for(source)?.join("plans"))
}

fn get_comments_dir_for(source: &PlanSource) -> Result<PathBuf, String> {
    Ok(get_claude_dir_for(source)?.join("plan-reviews"))
}

// ── WSL Detection ────────────────────────────────────────────

/// wsl.exe --list --quiet 输出 UTF-16 LE 编码，需特殊解码
fn decode_wsl_output(bytes: &[u8]) -> String {
    // 检测 UTF-16 LE BOM 或成对的零字节（UTF-16 特征）
    if bytes.len() >= 2
        && (bytes[0] == 0xFF && bytes[1] == 0xFE || bytes.len() > 1 && bytes[1] == 0x00)
    {
        let utf16: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|c| u16::from_le_bytes([c[0], c[1]]))
            .collect();
        String::from_utf16_lossy(&utf16)
            .trim_start_matches('\u{feff}')
            .to_string()
    } else {
        String::from_utf8_lossy(bytes).to_string()
    }
}

/// 列出所有已安装的 WSL 发行版
///
/// 注意：`wsl.exe --list --quiet` 在某些 Windows 版本上会返回非零退出码，
/// 但仍会将发行版列表输出到 stdout，因此不能依赖 status.success() 过滤。
fn list_wsl_distributions() -> Vec<String> {
    // 尝试 PATH 中的 wsl.exe，失败则回退到绝对路径
    let try_list = |exe: &str| -> Vec<u8> {
        Command::new(exe)
            .args(["--list", "--quiet"])
            .output()
            .map(|o| {
                if !o.stdout.is_empty() {
                    o.stdout
                } else {
                    o.stderr
                }
            })
            .unwrap_or_default()
    };

    let mut bytes = try_list("wsl.exe");
    if bytes.is_empty() {
        bytes = try_list(r"C:\Windows\System32\wsl.exe");
    }

    if bytes.is_empty() {
        return vec![];
    }

    decode_wsl_output(&bytes)
        .lines()
        .map(|s| {
            // 清理 null 字节、BOM 标记及所有控制字符（UTF-16 解码产物）
            s.chars()
                .filter(|&c| !c.is_control() && c != '\u{feff}')
                .collect::<String>()
                .trim()
                .to_string()
        })
        // 过滤空字符串以及不含任何字母数字字符的条目
        .filter(|s| !s.is_empty() && s.chars().any(|c| c.is_alphanumeric()))
        .collect()
}

// ── Data Structures ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub modified: String,
    pub size: u64,
    pub comment_count: usize,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plan {
    pub id: String,
    pub name: String,
    pub path: String,
    pub content: String,
    pub modified: String,
    pub comments: Vec<Comment>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: String,
    pub plan_id: String,
    pub line_number: Option<usize>,
    pub line_content: String,
    pub section_title: String,
    pub selected_text: String,
    pub text: String,
    #[serde(rename = "type")]
    pub comment_type: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentData {
    pub text: String,
    #[serde(rename = "type")]
    pub comment_type: String,
    pub section_title: String,
    pub selected_text: String,
}

// ── Plan Operations ─────────────────────────────────────────

/// Lightweight comment count - avoids full deserialization of Comment structs
fn count_comments(comments_dir: &Path, plan_filename: &str) -> usize {
    let cf = comments_file_path(comments_dir, plan_filename);
    if !cf.exists() {
        return 0;
    }
    fs::read_to_string(&cf)
        .ok()
        .and_then(|s| serde_json::from_str::<Vec<serde_json::Value>>(&s).ok())
        .map(|v| v.len())
        .unwrap_or(0)
}

fn list_plans(plans_dir: &Path, comments_dir: &Path) -> Vec<PlanInfo> {
    let mut plans = Vec::new();

    if !plans_dir.exists() {
        return plans;
    }

    if let Ok(entries) = fs::read_dir(plans_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(metadata) = fs::metadata(&path) {
                    let plan_id = path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("")
                        .to_string();
                    let comment_count = count_comments(comments_dir, &format!("{}.md", plan_id));

                    plans.push(PlanInfo {
                        id: plan_id.clone(),
                        name: path
                            .file_name()
                            .and_then(|s| s.to_str())
                            .unwrap_or("")
                            .to_string(),
                        path: path.to_string_lossy().to_string(),
                        modified: DateTime::<Utc>::from(
                            metadata.modified().unwrap_or(std::time::SystemTime::now()),
                        )
                        .to_rfc3339(),
                        size: metadata.len(),
                        comment_count,
                        source: "plans".to_string(),
                    });
                }
            }
        }
    }

    // Sort by modified date, newest first
    plans.sort_by(|a, b| b.modified.cmp(&a.modified));
    plans
}

fn get_plan(plan_id: &str, plans_dir: &Path, comments_dir: &Path) -> Option<Plan> {
    let path = plans_dir.join(format!("{}.md", plan_id));

    if !path.exists() {
        return None;
    }

    let content = fs::read_to_string(&path).ok()?;
    let metadata = fs::metadata(&path).ok()?;
    let comments = sync_comments_with_plan(plan_id, &content, comments_dir);

    Some(Plan {
        id: plan_id.to_string(),
        name: path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        content,
        modified: DateTime::<Utc>::from(
            metadata.modified().unwrap_or(std::time::SystemTime::now()),
        )
        .to_rfc3339(),
        comments,
    })
}

fn comments_file_path(comments_dir: &Path, plan_filename: &str) -> PathBuf {
    comments_dir.join(plan_filename.replace(".md", ".comments.json"))
}

fn load_comments(comments_dir: &Path, plan_filename: &str) -> Vec<Comment> {
    let cf = comments_file_path(comments_dir, plan_filename);
    if !cf.exists() {
        return Vec::new();
    }

    fs::read_to_string(&cf)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_comments(
    comments_dir: &Path,
    plan_filename: &str,
    comments: &[Comment],
) -> std::io::Result<()> {
    let cf = comments_file_path(comments_dir, plan_filename);

    // Ensure comments directory exists
    if let Some(parent) = cf.parent() {
        fs::create_dir_all(parent)?;
    }

    let json = serde_json::to_string_pretty(comments).unwrap_or_default();
    fs::write(cf, json)
}

fn build_comment_block(comment: &Comment) -> String {
    let emoji = match comment.comment_type.as_str() {
        "comment" => "💬",
        "suggestion" => "💡",
        "question" => "❓",
        "approve" => "✅",
        "reject" => "❌",
        _ => "💬",
    };

    let mut block = format!("### {} {}", emoji, comment.comment_type.to_uppercase());

    if !comment.selected_text.is_empty() {
        let excerpt = if comment.selected_text.len() > 80 {
            format!("{}...", &comment.selected_text[..80])
        } else {
            comment.selected_text.clone()
        };
        block.push_str(&format!(" (on: \"{}\")", excerpt));
    } else if !comment.section_title.is_empty() {
        block.push_str(&format!(" (re: \"{}\")", comment.section_title));
    }

    if let Some(line_num) = comment.line_number {
        block.push_str(&format!(" [Line {}]", line_num));
    }

    let quoted_text = comment
        .text
        .split('\n')
        .map(|line| format!("> {}", line))
        .collect::<Vec<_>>()
        .join("\n");

    block.push_str(&format!("\n\n{}\n\n", quoted_text));

    let ts = DateTime::parse_from_rfc3339(&comment.created_at)
        .unwrap_or_else(|_| Utc::now().into())
        .format("%Y/%m/%d %H:%M")
        .to_string();

    block.push_str(&format!("_— Reviewer, {}_\n\n", ts));

    block
}

fn parse_comments_from_plan(plan_id: &str, content: &str) -> Vec<Comment> {
    let mut comments = Vec::new();

    // Simple regex-like parsing for comment blocks
    let type_by_emoji = [
        ("💬", "comment"),
        ("💡", "suggestion"),
        ("❓", "question"),
        ("✅", "approve"),
        ("❌", "reject"),
    ];

    // Split content by comment block pattern
    let blocks: Vec<&str> = content.split("### ").skip(1).collect();

    for block in blocks {
        for (emoji, comment_type) in &type_by_emoji {
            if block.starts_with(emoji) {
                let lines: Vec<&str> = block.lines().collect();
                let mut selected_text = String::new();
                let mut section_title = String::new();
                let mut text_lines = Vec::new();
                let mut created_at = String::new();

                // Parse header line
                if let Some(header) = lines.first() {
                    let header = header.strip_prefix(emoji).unwrap_or(header).trim();
                    let header = header.strip_prefix(*comment_type).unwrap_or(header).trim();

                    // Extract (on: "...") or (re: "...")
                    if let Some(start) = header.find("(on: \"") {
                        if let Some(end) = header[start..].find("\")") {
                            selected_text = header[start + 6..start + end].to_string();
                        }
                    } else if let Some(start) = header.find("(re: \"") {
                        if let Some(end) = header[start..].find("\")") {
                            section_title = header[start + 6..start + end].to_string();
                        }
                    }
                }

                // Parse quoted text and timestamp
                for line in &lines[1..] {
                    if line.starts_with("> ") {
                        text_lines.push(line.strip_prefix("> ").unwrap_or(line));
                    } else if line.starts_with("_— Reviewer, ") {
                        // Parse timestamp
                        if let Some(ts) = line.strip_prefix("_— Reviewer, ") {
                            let ts = ts.trim_end_matches('_');
                            if let Ok(dt) =
                                chrono::NaiveDateTime::parse_from_str(ts, "%Y/%m/%d %H:%M")
                            {
                                created_at = dt.and_utc().to_rfc3339();
                            }
                        }
                    } else if !line.is_empty() && !text_lines.is_empty() {
                        text_lines.push(line);
                    }
                }

                if !text_lines.is_empty() && !created_at.is_empty() {
                    comments.push(Comment {
                        id: format!("comment-{}", Uuid::new_v4()),
                        plan_id: plan_id.to_string(),
                        line_number: None,
                        line_content: String::new(),
                        section_title,
                        selected_text,
                        text: text_lines.join("\n"),
                        comment_type: comment_type.to_string(),
                        status: "pending".to_string(),
                        created_at,
                    });
                }
                break;
            }
        }
    }

    comments
}

fn sync_comments_with_plan(plan_id: &str, content: &str, comments_dir: &Path) -> Vec<Comment> {
    let plan_filename = format!("{}.md", plan_id);
    let original_comments = load_comments(comments_dir, &plan_filename);
    let original_count = original_comments.len();
    let mut comments = original_comments;

    // Direction 1: Remove JSON comments not in plan file
    let mut synced = Vec::new();
    for comment in &comments {
        let block = build_comment_block(comment);
        if content.contains(&block) {
            synced.push(comment.clone());
        }
    }
    comments = synced;

    // Direction 2: Add plan-file comments missing from JSON
    let plan_comments = parse_comments_from_plan(plan_id, content);
    let existing_blocks: std::collections::HashSet<String> =
        comments.iter().map(build_comment_block).collect();

    for pc in plan_comments {
        let candidate = build_comment_block(&pc);
        if !existing_blocks.contains(&candidate) {
            let mut new_comment = pc;
            new_comment.id = format!("comment-{}", Uuid::new_v4());
            comments.push(new_comment);
        }
    }

    // Save only if changed (compare with original count to avoid redundant I/O)
    if comments.len() != original_count {
        let _ = save_comments(comments_dir, &plan_filename, &comments);
    }

    comments
}

fn add_comment(
    plan_id: &str,
    comment_data: CommentData,
    plans_dir: &Path,
    comments_dir: &Path,
) -> Result<Comment, String> {
    let plan_filename = format!("{}.md", plan_id);
    let mut comments = load_comments(comments_dir, &plan_filename);

    let now = Utc::now().to_rfc3339();
    let new_comment = Comment {
        id: format!("comment-{}", Uuid::new_v4()),
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

    comments.push(new_comment.clone());
    save_comments(comments_dir, &plan_filename, &comments)
        .map_err(|e| format!("Failed to save comments: {}", e))?;

    // 注入评论到 plan 文件
    inject_comment_into_plan(plan_id, &new_comment, plans_dir)?;

    Ok(new_comment)
}

fn delete_comment(
    plan_id: &str,
    comment_id: &str,
    plans_dir: &Path,
    comments_dir: &Path,
) -> Result<bool, String> {
    let plan_filename = format!("{}.md", plan_id);
    let comments = load_comments(comments_dir, &plan_filename);

    // Find the comment
    let target = comments.iter().find(|c| c.id == comment_id).cloned();

    if let Some(target) = target {
        // Remove from list
        let comments: Vec<Comment> = comments
            .into_iter()
            .filter(|c| c.id != comment_id)
            .collect();

        save_comments(comments_dir, &plan_filename, &comments)
            .map_err(|e| format!("Failed to save comments: {}", e))?;

        // 从 plan 文件中移除评论
        remove_comment_from_plan(plan_id, &target, plans_dir)?;
    }

    Ok(true)
}

fn inject_comment_into_plan(
    plan_id: &str,
    comment: &Comment,
    plans_dir: &Path,
) -> Result<(), String> {
    let path = plans_dir.join(format!("{}.md", plan_id));

    if !path.exists() {
        return Err("Plan file not found".to_string());
    }

    let mut content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read plan: {}", e))?;

    let block = build_comment_block(comment);

    if !comment.selected_text.is_empty() {
        // Insert inline after the paragraph containing the selected text
        if let Some(pos) = content.find(&comment.selected_text) {
            let end_of_match = pos + comment.selected_text.len();
            // Find the next blank line or end of file
            let next_blank = content[end_of_match..].find("\n\n");
            let insert_pos = if let Some(offset) = next_blank {
                end_of_match + offset
            } else {
                content.len()
            };
            content = format!(
                "{}\n\n{}{}",
                &content[..insert_pos],
                block,
                &content[insert_pos..]
            );
        } else {
            // Fallback: append at bottom
            append_comment_to_bottom(&mut content, &block);
        }
    } else {
        // Section-level comment: append at bottom
        append_comment_to_bottom(&mut content, &block);
    }

    fs::write(&path, content).map_err(|e| format!("Failed to write plan: {}", e))?;

    Ok(())
}

fn append_comment_to_bottom(content: &mut String, block: &str) {
    let review_marker = "## 📝 Review Comments";
    if content.contains(review_marker) {
        content.push_str(block);
    } else {
        content.push_str(&format!("\n\n---\n\n{}\n\n{}", review_marker, block));
    }
}

fn remove_comment_from_plan(
    plan_id: &str,
    comment: &Comment,
    plans_dir: &Path,
) -> Result<(), String> {
    let path = plans_dir.join(format!("{}.md", plan_id));

    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read plan: {}", e))?;

    let block = build_comment_block(comment);
    let new_content = content.replace(&block, "\n\n");

    // Clean up empty Review Comments section
    let review_marker = "## 📝 Review Comments";
    let new_content = if new_content.contains(review_marker) {
        let parts: Vec<&str> = new_content.split(review_marker).collect();
        if parts.len() == 2 && parts[1].trim().is_empty() {
            parts[0].trim_end().to_string()
        } else {
            new_content
        }
    } else {
        new_content
    };

    if new_content != content {
        fs::write(&path, new_content).map_err(|e| format!("Failed to write plan: {}", e))?;
    }

    Ok(())
}

// ── Tauri Commands ──────────────────────────────────────────

#[tauri::command]
fn detect_wsl() -> WslInfo {
    if cfg!(target_os = "windows") {
        let distributions = list_wsl_distributions();
        WslInfo {
            available: !distributions.is_empty(),
            distributions,
        }
    } else {
        WslInfo {
            available: false,
            distributions: vec![],
        }
    }
}

#[tauri::command]
fn get_plans(source: Option<String>) -> Vec<PlanInfo> {
    let ps = PlanSource::from_opt(source.as_deref());
    let Ok(plans_dir) = get_plans_dir_for(&ps) else {
        return vec![];
    };
    let Ok(comments_dir) = get_comments_dir_for(&ps) else {
        return vec![];
    };
    list_plans(&plans_dir, &comments_dir)
}

#[tauri::command]
fn get_plan_by_id(plan_id: String, source: Option<String>) -> Option<Plan> {
    let ps = PlanSource::from_opt(source.as_deref());
    let plans_dir = get_plans_dir_for(&ps).ok()?;
    let comments_dir = get_comments_dir_for(&ps).ok()?;
    get_plan(&plan_id, &plans_dir, &comments_dir)
}

#[tauri::command]
fn add_comment_command(
    plan_id: String,
    comment_data: CommentData,
    source: Option<String>,
) -> Result<Comment, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    let plans_dir = get_plans_dir_for(&ps)?;
    let comments_dir = get_comments_dir_for(&ps)?;
    add_comment(&plan_id, comment_data, &plans_dir, &comments_dir)
}

#[tauri::command]
fn delete_comment_command(
    plan_id: String,
    comment_id: String,
    source: Option<String>,
) -> Result<bool, String> {
    let ps = PlanSource::from_opt(source.as_deref());
    let plans_dir = get_plans_dir_for(&ps)?;
    let comments_dir = get_comments_dir_for(&ps)?;
    delete_comment(&plan_id, &comment_id, &plans_dir, &comments_dir)
}

// ── Main Entry Point ────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // 确保 Windows 本地目录存在（启动时创建，非阻塞）
            let _ = fs::create_dir_all(get_plans_dir());
            let _ = fs::create_dir_all(get_comments_dir());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            detect_wsl,
            get_plans,
            get_plan_by_id,
            add_comment_command,
            delete_comment_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
