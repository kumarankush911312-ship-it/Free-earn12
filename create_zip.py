import os
import zipfile
import shutil

ROOT_DIR = "/app/applet" if os.path.exists("/app/applet") else os.getcwd()

FULL_ZIP_FILENAME = "free-earn-app-full-source.zip"
USER_ZIP_FILENAME = "free-earn-user-app.zip"
ADMIN_ZIP_FILENAME = "free-earn-admin-portal.zip"

OUTPUT_FULL_ZIP = os.path.join(ROOT_DIR, FULL_ZIP_FILENAME)
OUTPUT_USER_ZIP = os.path.join(ROOT_DIR, USER_ZIP_FILENAME)
OUTPUT_ADMIN_ZIP = os.path.join(ROOT_DIR, ADMIN_ZIP_FILENAME)

IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".cache",
    ".npm",
    "tmp",
    ".turbo",
    ".vscode",
    ".idea",
    "dist"
}

IGNORE_FILES = {
    FULL_ZIP_FILENAME,
    USER_ZIP_FILENAME,
    ADMIN_ZIP_FILENAME,
    "create_zip.py"
}

print(f"Creating separated packages from: {ROOT_DIR}")

# 1. CREATE FULL REPOSITORY ZIP
with zipfile.ZipFile(OUTPUT_FULL_ZIP, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        for file in files:
            if file in IGNORE_FILES or file.endswith('.zip') or file.endswith('.tar.gz'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            zipf.write(full_path, arcname=os.path.join("free-earn-app", rel_path))

# 2. CREATE PURE USER-ONLY APP ZIP (NO ADMIN PANELS, NO SENSITIVE ADMIN FILES)
ADMIN_ONLY_FILES = {
    os.path.join("src", "views", "AdminPortalView.tsx"),
    os.path.join("src", "views", "AdminView.tsx"),
}

with zipfile.ZipFile(OUTPUT_USER_ZIP, 'w', zipfile.ZIP_DEFLATED) as user_zip:
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        for file in files:
            if file in IGNORE_FILES or file.endswith('.zip') or file.endswith('.tar.gz'):
                continue
            
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            
            # If it's an admin view, write a clean empty placeholder instead of real admin panel
            if rel_path in ADMIN_ONLY_FILES:
                stub_content = "import React from 'react';\nexport const AdminPortalView: React.FC = () => null;\nexport const AdminView: React.FC = () => null;\n"
                user_zip.writestr(os.path.join("free-earn-user-app", rel_path), stub_content)
                continue

            user_zip.write(full_path, arcname=os.path.join("free-earn-user-app", rel_path))

# 3. CREATE DEDICATED ADMIN PORTAL ZIP
with zipfile.ZipFile(OUTPUT_ADMIN_ZIP, 'w', zipfile.ZIP_DEFLATED) as admin_zip:
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
        for file in files:
            if file in IGNORE_FILES or file.endswith('.zip') or file.endswith('.tar.gz'):
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            admin_zip.write(full_path, arcname=os.path.join("free-earn-admin-portal", rel_path))

# Copy all 3 zips to dist and public directories for instant web download
target_dirs = [
    os.path.join(ROOT_DIR, "dist"),
    os.path.join(ROOT_DIR, "public")
]

for d in target_dirs:
    os.makedirs(d, exist_ok=True)
    shutil.copyfile(OUTPUT_FULL_ZIP, os.path.join(d, FULL_ZIP_FILENAME))
    shutil.copyfile(OUTPUT_USER_ZIP, os.path.join(d, USER_ZIP_FILENAME))
    shutil.copyfile(OUTPUT_ADMIN_ZIP, os.path.join(d, ADMIN_ZIP_FILENAME))

print(f"SUCCESS: Created separate packages:")
print(f"  1. USER APP: {OUTPUT_USER_ZIP} ({os.path.getsize(OUTPUT_USER_ZIP)/(1024*1024):.2f} MB)")
print(f"  2. ADMIN PORTAL: {OUTPUT_ADMIN_ZIP} ({os.path.getsize(OUTPUT_ADMIN_ZIP)/(1024*1024):.2f} MB)")
print(f"  3. MASTER APP: {OUTPUT_FULL_ZIP} ({os.path.getsize(OUTPUT_FULL_ZIP)/(1024*1024):.2f} MB)")
