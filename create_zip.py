import os
import zipfile
import shutil

ROOT_DIR = "/app/applet" if os.path.exists("/app/applet") else os.getcwd()
ZIP_FILENAME = "free-earn-app-full-source.zip"
OUTPUT_ZIP_ROOT = os.path.join(ROOT_DIR, ZIP_FILENAME)

IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".cache",
    ".npm",
    "tmp",
    ".turbo",
    ".vscode",
    ".idea"
}

IGNORE_FILES = {
    ZIP_FILENAME,
    "create_zip.py"
}

print(f"Creating ZIP from root: {ROOT_DIR}")

with zipfile.ZipFile(OUTPUT_ZIP_ROOT, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(ROOT_DIR):
        # Modify dirs in-place to ignore node_modules etc.
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        
        for file in files:
            if file in IGNORE_FILES:
                continue
            if file.endswith('.zip') or file.endswith('.tar.gz'):
                continue
            
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            zipf.write(full_path, arcname=os.path.join("free-earn-app", rel_path))

# Also create free-earn-user-app.zip as an exact copy for easy identification
user_zip_root = os.path.join(ROOT_DIR, "free-earn-user-app.zip")
shutil.copyfile(OUTPUT_ZIP_ROOT, user_zip_root)

# Also copy to dist so it is directly downloadable as a static file
dist_dir = os.path.join(ROOT_DIR, "dist")
if os.path.exists(dist_dir):
    shutil.copyfile(OUTPUT_ZIP_ROOT, os.path.join(dist_dir, ZIP_FILENAME))
    shutil.copyfile(OUTPUT_ZIP_ROOT, os.path.join(dist_dir, "free-earn-user-app.zip"))

# Also create public dir if not exists and copy
public_dir = os.path.join(ROOT_DIR, "public")
os.makedirs(public_dir, exist_ok=True)
shutil.copyfile(OUTPUT_ZIP_ROOT, os.path.join(public_dir, ZIP_FILENAME))
shutil.copyfile(OUTPUT_ZIP_ROOT, os.path.join(public_dir, "free-earn-user-app.zip"))

zip_size_mb = os.path.getsize(OUTPUT_ZIP_ROOT) / (1024 * 1024)
print(f"SUCCESS: Created {OUTPUT_ZIP_ROOT} and {user_zip_root} ({zip_size_mb:.2f} MB)")
