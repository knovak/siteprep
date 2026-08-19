import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEPLOY_SCRIPT = REPO_ROOT / ".claude/skills/deploy-demo/scripts/deploy_demo.py"
METADATA_SCRIPT = REPO_ROOT / "scripts/demo_metadata.mjs"


class DeployDemoTest(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.test_repo = Path(self.temporary_directory.name)
        (self.test_repo / "demos").mkdir()

    def tearDown(self):
        self.temporary_directory.cleanup()

    def deploy(self, source, *arguments, check=True):
        return subprocess.run(
            [
                "python3",
                str(DEPLOY_SCRIPT),
                "--repo-root",
                str(self.test_repo),
                "--source",
                str(source),
                *arguments,
            ],
            check=check,
            capture_output=True,
            text=True,
        )

    def metadata(self, command, demo_dir, demo_name, *arguments):
        result = subprocess.run(
            ["node", str(METADATA_SCRIPT), command, str(demo_dir), demo_name, *arguments],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()

    def test_creates_and_fully_replaces_a_demo(self):
        first_source = self.test_repo / "first-source"
        (first_source / "pages").mkdir(parents=True)
        (first_source / "assets").mkdir()
        shutil.copy2(REPO_ROOT / "demos/RMD calculator/index.html", first_source / "pages/app.html")
        shutil.copy2(REPO_ROOT / "AGENTS.md", first_source / "assets/notes.txt")
        shutil.copy2(REPO_ROOT / "package.json", first_source / ".hidden-config")
        (first_source / "notes-link.txt").symlink_to("assets/notes.txt")

        self.deploy(
            first_source,
            "--destination",
            "Example Demo",
            "--title",
            "Example & Demo",
            "--description",
            "Read Local notes and visit Project website.",
            "--root-html",
            "pages/app.html",
            "--link",
            "Local notes",
            "assets/notes.txt#pull-requests",
            "--link",
            "Project website",
            "https://example.com/?a=1&b=2",
        )

        destination = self.test_repo / "demos/Example Demo"
        self.assertTrue((destination / "pages/app.html").is_file())
        self.assertTrue((destination / ".hidden-config").is_file())
        self.assertTrue((destination / "notes-link.txt").is_symlink())
        manifest = json.loads((destination / "demo.json").read_text())
        self.assertEqual(manifest["root"], "pages/app.html")
        self.assertEqual(len(manifest["links"]), 2)
        self.assertEqual(
            self.metadata("href", destination, "Example Demo"),
            "./Example%20Demo/pages/app.html",
        )
        self.assertEqual(
            self.metadata("html-field", destination, "Example Demo", "title"),
            "Example &amp; Demo",
        )
        self.assertIn(
            'href="./Example%20Demo/assets/notes.txt#pull-requests"',
            self.metadata("description", destination, "Example Demo"),
        )
        self.assertEqual(self.metadata("links", destination, "Example Demo"), "")

        second_source = self.test_repo / "second-source"
        second_source.mkdir()
        shutil.copy2(REPO_ROOT / "demos/SBDC Night Sky/index.html", second_source / "index.html")
        self.deploy(
            second_source,
            "--destination",
            "Example Demo",
            "--title",
            "Replacement",
            "--description",
            "Replacement contents",
        )

        self.assertTrue((destination / "index.html").is_file())
        self.assertFalse((destination / "pages").exists())
        self.assertFalse((destination / ".hidden-config").exists())
        self.assertEqual(json.loads((destination / "demo.json").read_text())["root"], "index.html")

    def test_requires_root_html_and_existing_local_links_before_copying(self):
        source = self.test_repo / "source"
        (source / "pages").mkdir(parents=True)
        shutil.copy2(REPO_ROOT / "demos/RMD calculator/index.html", source / "pages/start.html")

        missing_root = self.deploy(
            source,
            "--destination",
            "missing-root",
            "--title",
            "Missing Root",
            "--description",
            "Should fail",
            check=False,
        )
        self.assertEqual(missing_root.returncode, 2)
        self.assertIn("provide --root-html", missing_root.stderr)
        self.assertFalse((self.test_repo / "demos/missing-root").exists())

        missing_link = self.deploy(
            source,
            "--destination",
            "missing-link",
            "--title",
            "Missing Link",
            "--description",
            "Should fail",
            "--root-html",
            "pages/start.html",
            "--link",
            "Absent file",
            "absent.html",
            check=False,
        )
        self.assertEqual(missing_link.returncode, 2)
        self.assertIn("local link target does not exist", missing_link.stderr)
        self.assertFalse((self.test_repo / "demos/missing-link").exists())


if __name__ == "__main__":
    unittest.main()
