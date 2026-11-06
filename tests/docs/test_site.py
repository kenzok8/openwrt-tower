"""文档站自检：导航完整、锚点唯一、站内链接可达、搜索索引可用。

运行：python3 -m unittest discover -s tests/docs -t . -p 'test_*.py'
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SITE = REPO / "docs" / "site"
BUILD = SITE / "build.py"


class SiteContentTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.site = json.loads((SITE / "site.json").read_text(encoding="utf-8"))
        cls.pages = [item for group in cls.site["nav"] for item in group["items"]]

    def test_nav_covers_every_content_file(self):
        listed = {item["page"] for item in self.pages}
        on_disk = {path.name for path in (SITE / "content").glob("*.html")}
        self.assertEqual(on_disk - listed, set(), "有正文页没登记进 site.json 导航")

    def test_nav_files_exist(self):
        for item in self.pages:
            self.assertTrue((SITE / "content" / item["page"]).is_file(), f"缺少正文：{item['page']}")

    def test_every_page_starts_with_h1(self):
        for item in self.pages:
            body = (SITE / "content" / item["page"]).read_text(encoding="utf-8").strip()
            self.assertTrue(body.startswith("<h1"), f"{item['page']} 应以 <h1> 开头")

    def test_site_meta_complete(self):
        for key in ("title", "subtitle", "description", "base_url", "version_file", "nav"):
            self.assertIn(key, self.site)

    def test_no_absolute_asset_paths(self):
        """Pages 部署在 /openwrt-tower/ 子路径下，绝对路径会 404。"""
        for item in self.pages:
            body = (SITE / "content" / item["page"]).read_text(encoding="utf-8")
            self.assertNotIn('href="/', body, f"{item['page']} 里有以 / 开头的链接")
            self.assertNotIn('src="/', body, f"{item['page']} 里有以 / 开头的资源")


class BuildTest(unittest.TestCase):
    def test_check_mode_passes(self):
        result = subprocess.run(
            [sys.executable, str(BUILD), "--check"],
            capture_output=True,
            text=True,
            cwd=REPO,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_build_outputs_pages_and_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = subprocess.run(
                [sys.executable, str(BUILD), "--output", tmp],
                capture_output=True,
                text=True,
                cwd=REPO,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            out = Path(tmp)
            site = json.loads((SITE / "site.json").read_text(encoding="utf-8"))
            for group in site["nav"]:
                for item in group["items"]:
                    page = out / item["page"]
                    self.assertTrue(page.is_file(), f"没有生成 {item['page']}")
                    text = page.read_text(encoding="utf-8")
                    self.assertIn('class="sidebar"', text)
                    self.assertIn('class="content"', text)
                    # 每页侧边栏都把自己标成当前页
                    self.assertIn(f'href="{item["page"]}" aria-current="page"', text)
            self.assertTrue((out / "search-index.json").is_file())
            self.assertTrue((out / "404.html").is_file())
            self.assertTrue((out / "assets" / "site.css").is_file())

            index = json.loads((out / "search-index.json").read_text(encoding="utf-8"))
            self.assertEqual(len(index), sum(len(group["items"]) for group in site["nav"]))
            for entry in index:
                self.assertTrue(entry["title"])
                self.assertTrue(entry["text"], f"{entry['page']} 没有可搜索正文")

    def test_broken_link_is_reported(self):
        """故意造一个死链，确认自检会拦下来。"""
        with tempfile.TemporaryDirectory() as tmp:
            site_copy = Path(tmp) / "site"
            subprocess.run(["cp", "-r", str(SITE), str(site_copy)], check=True)
            page = site_copy / "content" / "index.html"
            page.write_text(page.read_text(encoding="utf-8") + '\n<p><a href="nope.html">死链</a></p>', encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(site_copy / "build.py"), "--check"],
                capture_output=True,
                text=True,
                cwd=REPO,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("nope.html", result.stderr)


if __name__ == "__main__":
    unittest.main()
