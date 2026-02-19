// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

// ── Configuration ────────────────────────────────────────────

fn get_claude_dir() -> PathBuf {
    dirs::home_dir()
        .expect("Failed to get home directory")
        .join(".claude")
}

fn get_plans_dir() -> PathBuf {
    get_claude_dir().join("plans")
}

fn get_comments_dir() -> PathBuf {
    get_claude_dir().join("plan-reviews")
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

fn list_plans(comments_dir: &Path) -> Vec<PlanInfo> {
    let plans_dir = get_plans_dir();
    let mut plans = Vec::new();

    if !plans_dir.exists() {
        return plans;
    }

    if let Ok(entries) = fs::read_dir(&plans_dir) {
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

fn get_plan(plan_id: &str, comments_dir: &Path) -> Option<Plan> {
    let plans_dir = get_plans_dir();
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

    // Inject comment into plan file
    inject_comment_into_plan(plan_id, &new_comment)?;

    Ok(new_comment)
}

fn delete_comment(plan_id: &str, comment_id: &str, comments_dir: &Path) -> Result<bool, String> {
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

        // Remove from plan file
        remove_comment_from_plan(plan_id, &target)?;
    }

    Ok(true)
}

fn inject_comment_into_plan(plan_id: &str, comment: &Comment) -> Result<(), String> {
    let plans_dir = get_plans_dir();
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

fn remove_comment_from_plan(plan_id: &str, comment: &Comment) -> Result<(), String> {
    let plans_dir = get_plans_dir();
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
fn get_plans() -> Vec<PlanInfo> {
    let comments_dir = get_comments_dir();
    list_plans(&comments_dir)
}

#[tauri::command]
fn get_plan_by_id(plan_id: String) -> Option<Plan> {
    let comments_dir = get_comments_dir();
    get_plan(&plan_id, &comments_dir)
}

#[tauri::command]
fn add_comment_command(plan_id: String, comment_data: CommentData) -> Result<Comment, String> {
    let comments_dir = get_comments_dir();
    add_comment(&plan_id, comment_data, &comments_dir)
}

#[tauri::command]
fn delete_comment_command(plan_id: String, comment_id: String) -> Result<bool, String> {
    let comments_dir = get_comments_dir();
    delete_comment(&plan_id, &comment_id, &comments_dir)
}

// ── Main Entry Point ────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // Ensure directories exist (runs after window creation, non-blocking)
            let _ = fs::create_dir_all(get_plans_dir());
            let _ = fs::create_dir_all(get_comments_dir());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_plans,
            get_plan_by_id,
            add_comment_command,
            delete_comment_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
