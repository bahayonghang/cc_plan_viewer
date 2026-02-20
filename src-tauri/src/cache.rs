// 计划列表缓存模块 - 基于 TTL 和文件修改时间的缓存策略

use crate::plan::PlanInfo;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime};

/// 缓存条目
struct CacheEntry {
    plans: Vec<PlanInfo>,
    cached_at: Instant,
    dir_mtime: SystemTime,
}

/// 计划列表缓存
/// 使用 Mutex 保护的 HashMap，按目录路径索引
pub struct PlanListCache {
    entries: Mutex<HashMap<String, CacheEntry>>,
    ttl: Duration,
}

impl PlanListCache {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            ttl: Duration::from_millis(500),
        }
    }

    /// 检查缓存是否有效：TTL 未过期且目录修改时间未变
    pub fn get_if_valid(
        &self,
        dir_key: &str,
        current_dir_mtime: SystemTime,
    ) -> Option<Vec<PlanInfo>> {
        let entries = self.entries.lock().ok()?;
        let entry = entries.get(dir_key)?;

        // 检查 TTL
        if entry.cached_at.elapsed() > self.ttl {
            return None;
        }

        // 检查目录修改时间
        if entry.dir_mtime != current_dir_mtime {
            return None;
        }

        Some(entry.plans.clone())
    }

    /// 更新缓存
    pub fn update(&self, dir_key: &str, plans: Vec<PlanInfo>, dir_mtime: SystemTime) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.insert(
                dir_key.to_string(),
                CacheEntry {
                    plans,
                    cached_at: Instant::now(),
                    dir_mtime,
                },
            );
        }
    }

    /// 使指定目录的缓存失效
    pub fn invalidate(&self, dir_key: &str) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.remove(dir_key);
        }
    }

    /// 使所有缓存失效
    #[allow(dead_code)]
    pub fn invalidate_all(&self) {
        if let Ok(mut entries) = self.entries.lock() {
            entries.clear();
        }
    }
}
