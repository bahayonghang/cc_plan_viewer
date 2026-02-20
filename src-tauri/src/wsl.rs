// ── WSL Detection ────────────────────────────────────────────

use std::process::Command;

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
pub fn list_wsl_distributions() -> Vec<String> {
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
