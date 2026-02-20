// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cache;
mod commands;
mod plan;
mod source;
mod ssh;
mod wsl;

use cache::PlanListCache;
use ssh::connection::SshConnectionManager;
use std::fs;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SshConnectionManager::new())
        .manage(PlanListCache::new())
        .setup(|_app| {
            // 确保 Windows 本地目录存在（启动时创建，非阻塞）
            let _ = fs::create_dir_all(source::get_plans_dir());
            let _ = fs::create_dir_all(source::get_comments_dir());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::detect_wsl,
            commands::get_plans,
            commands::get_plan_by_id,
            commands::add_comment_command,
            commands::delete_comment_command,
            commands::get_ssh_configs,
            commands::save_ssh_config_command,
            commands::delete_ssh_config_command,
            commands::test_ssh_connection,
            commands::disconnect_ssh,
            commands::get_ssh_connection_status,
            commands::get_custom_css,
            commands::save_custom_css
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
