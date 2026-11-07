#!/usr/bin/env python3
"""Package the buildless game without network dependencies (Python stdlib only)."""
import argparse
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit
import zipfile


ROOT = Path(__file__).resolve().parents[1]
VERSION_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,63}\Z")
REMOTE_RE = re.compile(r"(?:https?|wss?|ftp)://|[\"']\s*//[^/]", re.I)
CSS_URL_RE = re.compile(r"url\(\s*['\"]?([^)'\"\s]+)", re.I)
CSS_IMPORT_RE = re.compile(r"@import\s+['\"]([^'\"]+)", re.I)


class Resources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []
        self.scripts = []
        self.styles = []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "style":
            self.in_style = True
        if attrs.get("style"):
            self.styles.append(attrs["style"])
        if tag in {"script", "img", "audio", "video", "source", "track", "iframe", "embed", "input"}:
            if attrs.get("src"):
                self.urls.append(attrs["src"])
                if tag == "script":
                    self.scripts.append(attrs["src"])
        if tag == "video" and attrs.get("poster"):
            self.urls.append(attrs["poster"])
        if tag == "object" and attrs.get("data"):
            self.urls.append(attrs["data"])
        if tag == "link" and attrs.get("href"):
            self.urls.append(attrs["href"])
        if attrs.get("srcset"):
            self.urls.extend(part.strip().split()[0] for part in attrs["srcset"].split(",") if part.strip())

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            self.styles.append(data)


def local_resource(value, base=None):
    """Reject remote/absolute/escaping URLs; embedded resources need no file."""
    if value.startswith(("data:", "#")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith(("/", "\\")):
        raise ValueError(f"Offline package refuses external resource: {value}")
    path = ((base or ROOT) / unquote(parsed.path)).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f"Missing or outside-project resource: {value}")
    return path


def collect_files():
    index = ROOT / "index.html"
    html = index.read_text(encoding="utf-8")
    resources = Resources()
    resources.feed(html)
    if not resources.scripts:
        raise ValueError("No game scripts found in index.html")
    files = {index, *ROOT.glob("js/*.js")}
    for value in resources.urls:
        path = local_resource(value)
        if path:
            files.add(path)
    # Current game has inline CSS and procedural art; validate added CSS resources too.
    pending = list(files)
    seen = set()
    while pending:
        path = pending.pop()
        if path in seen or path.suffix not in {".html", ".css", ".js"}:
            continue
        seen.add(path)
        content = path.read_text(encoding="utf-8")
        if path.suffix == ".js":
            if REMOTE_RE.search(content):
                raise ValueError(f"Review remote URL in runtime script before packaging: {path.relative_to(ROOT)}")
            continue
        if path.suffix == ".html":
            page = Resources()
            page.feed(content)
            content = "\n".join(page.styles)
        for value in CSS_URL_RE.findall(content) + CSS_IMPORT_RE.findall(content):
            resource = local_resource(value, path.parent)
            if resource and resource not in files:
                files.add(resource)
                pending.append(resource)
    for relative in ("docs/ASSET-PROVENANCE.md", "LICENSE"):
        path = ROOT / relative
        if path.is_file():
            files.add(path)
    return files


def player_readme(version):
    return f"""機關浪人：川霧之間
版本：{version}（候選版本）

開始遊戲
1. 解壓縮整個資料夾；唔好直接喺 ZIP 入面開。
2. 用 Windows Chrome 或 Edge 開 index.html，即可離線玩，唔使安裝或開伺服器。
3. 畫面保留直向設計，可用滑鼠點擊／拖曳，或喺支援裝置觸控。
   可用 Space 暫停／繼續；其他角色操作以畫面按鈕為準。

存檔
遊戲會嘗試喺目前瀏覽器儲存進度。檔案位置、瀏覽器或網址改變，可能讀唔到舊進度。
file:// 本地檔案儲存由瀏覽器決定；無痕模式、清除網站資料或儲存限制會令存檔失效。
請喺戰術頁用「匯出存檔」定期備份；移動遊戲或更新前亦要備份。
下載版同網頁版唔會自動共用存檔；可用戰術頁「匯入存檔」載入備份轉移進度。

內容與驗證
本作係包含機關義肢嘅架空戰國故事；人物事件唔代表完整歷史重演。
優先驗證平台係 Windows Chrome／Edge；其他瀏覽器、手機觸控及效能仍需實機測試。
本包係候選版本，唔代表已完成玩家測試、素材權利確認或商店上架。
如附 ASSET-PROVENANCE.md／LICENSE，請一併閱讀；本說明唔會代替任何素材授權。
""".encode("utf-8")


def build(output, version):
    if not VERSION_RE.fullmatch(version) or ".." in version:
        raise ValueError("Version must be a portable filename token without '..'")
    files = collect_files()  # Validate everything before creating the output directory.
    output = Path(output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    folder = f"wasteland-{version}"
    destination = output / f"{folder}.zip"
    entries = {f"{folder}/{p.relative_to(ROOT).as_posix()}": p.read_bytes() for p in files}
    entries[f"{folder}/README.txt"] = player_readme(version)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in sorted(entries.items()):
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    checksum = destination.with_suffix(".zip.sha256")
    checksum.write_bytes(f"{digest}  {destination.name}\n".encode("ascii"))
    return {"archive": str(destination), "checksum": str(checksum), "sha256": digest, "files": len(entries)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "dist", help="Output directory (default: repository dist/)")
    parser.add_argument("--version", default="0.2.0-rc1")
    args = parser.parse_args()
    try:
        print(json.dumps(build(args.output, args.version), ensure_ascii=False))
    except (OSError, ValueError) as error:
        parser.exit(1, f"Packaging failed: {error}\n")


if __name__ == "__main__":
    main()
