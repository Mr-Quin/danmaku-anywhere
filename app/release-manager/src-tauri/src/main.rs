#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    prefer_host_wayland();

    release_manager_lib::run()
}

// The AppImage bundles an older libwayland than the host it runs on, and that
// stale client can't negotiate EGL with a newer compositor/Mesa, so the window
// fails to start (blank screen, EGL_BAD_PARAMETER). When launched from the
// AppImage, preload the host's libwayland and re-exec once so the host libs win.
// LD_PRELOAD only takes effect at process start, hence the re-exec.
#[cfg(target_os = "linux")]
fn prefer_host_wayland() {
    use std::os::unix::process::CommandExt;

    // Only inside the AppImage, and only once (guard against an exec loop).
    if std::env::var_os("APPDIR").is_none() || std::env::var_os("RM_HOST_WAYLAND").is_some() {
        return;
    }

    let libs = [
        "libwayland-client.so.0",
        "libwayland-egl.so.1",
        "libwayland-cursor.so.0",
        "libwayland-server.so.0",
    ];
    let dirs = ["/usr/lib64", "/usr/lib/x86_64-linux-gnu", "/usr/lib"];

    let mut preload: Vec<String> = Vec::new();
    for lib in libs {
        for dir in dirs {
            let path = format!("{dir}/{lib}");
            if std::path::Path::new(&path).exists() {
                preload.push(path);
                break;
            }
        }
    }
    if preload.is_empty() {
        return;
    }

    if let Some(existing) = std::env::var_os("LD_PRELOAD") {
        if !existing.is_empty() {
            preload.insert(0, existing.to_string_lossy().into_owned());
        }
    }

    let Ok(exe) = std::env::current_exe() else {
        return;
    };

    std::env::set_var("LD_PRELOAD", preload.join(" "));
    std::env::set_var("RM_HOST_WAYLAND", "1");

    // exec replaces this process; it returns only on failure, in which case we
    // fall through and let the app try to start as before.
    let _ = std::process::Command::new(exe)
        .args(std::env::args_os().skip(1))
        .exec();
}
