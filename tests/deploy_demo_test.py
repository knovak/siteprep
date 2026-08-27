import json
import os
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

    def test_supports_external_demo_roots(self):
        demo_dir = self.test_repo / "demos" / "External Demo"
        demo_dir.mkdir()
        (demo_dir / "demo.json").write_text(
            json.dumps(
                {
                    "title": "External Demo",
                    "description": "Open User guide.",
                    "root": "https://example.com/app/",
                    "links": [
                        {"label": "User guide", "href": "https://example.com/guide"}
                    ],
                }
            )
        )

        self.assertEqual(
            self.metadata("href", demo_dir, "External Demo"),
            "https://example.com/app/",
        )
        self.assertIn(
            'href="https://example.com/guide"',
            self.metadata("description", demo_dir, "External Demo"),
        )

    def test_orders_featured_then_by_initiative_activity(self):
        subprocess.run(["git", "init"], cwd=self.test_repo, check=True, capture_output=True)

        def write_demo(name, initiative=None, featured=False):
            demo_dir = self.test_repo / "demos" / name
            demo_dir.mkdir()
            manifest = {
                "title": name,
                "description": f"Open {name}.",
                "root": "https://example.com/",
            }
            if initiative:
                manifest["initiative"] = initiative
            if featured:
                manifest["featured"] = True
            (demo_dir / "demo.json").write_text(json.dumps(manifest))

        def commit(message, date):
            subprocess.run(["git", "add", "."], cwd=self.test_repo, check=True)
            subprocess.run(
                [
                    "git",
                    "-c",
                    "user.name=Test",
                    "-c",
                    "user.email=test@example.com",
                    "commit",
                    "-m",
                    message,
                ],
                cwd=self.test_repo,
                check=True,
                capture_output=True,
                env={"PATH": os.environ["PATH"], "GIT_AUTHOR_DATE": date, "GIT_COMMITTER_DATE": date},
            )

        older = self.test_repo / "initiatives" / "older"
        older.mkdir(parents=True)
        (older / "initiative.json").write_text("{}")
        write_demo("Older", initiative="older")
        commit("Add older initiative", "2026-01-01T00:00:00Z")

        newer = self.test_repo / "initiatives" / "newer"
        newer.mkdir()
        (newer / "initiative.json").write_text("{}")
        write_demo("Newer", initiative="newer")
        commit("Add newer initiative", "2026-02-01T00:00:00Z")

        write_demo("Featured", initiative="older", featured=True)
        commit("Add featured demo", "2026-03-01T00:00:00Z")

        result = subprocess.run(
            [
                "node",
                str(METADATA_SCRIPT),
                "order",
                str(self.test_repo / "demos"),
                str(self.test_repo),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        demos = result.stdout.splitlines()

        self.assertEqual(demos, ["Featured", "Newer", "Older"])

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

    def test_replacement_preserves_fields_the_helper_does_not_author(self):
        """A redeploy must not demote a demo or cut its link to its initiative.

        `initiative` and `featured` are read by the Demo TOC and written by
        nobody's flag, so a replacement that rewrites demo.json wholly used to
        drop both without a word.
        """
        initiative_dir = self.test_repo / "initiatives" / "repo-guide"
        initiative_dir.mkdir(parents=True)
        (initiative_dir / "initiative.json").write_text("{}")

        source = self.test_repo / "source"
        source.mkdir()
        (source / "index.html").write_text("<!doctype html><title>Guide</title>")

        self.deploy(
            source,
            "--destination",
            "Guide",
            "--title",
            "Guide",
            "--description",
            "The first publication.",
        )
        destination = self.test_repo / "demos" / "Guide"

        # Set by hand, the way an initiative-backed demo gets these today.
        manifest = json.loads((destination / "demo.json").read_text())
        self.assertNotIn("initiative", manifest)
        self.assertNotIn("featured", manifest)
        manifest["initiative"] = "repo-guide"
        manifest["featured"] = True
        (destination / "demo.json").write_text(json.dumps(manifest))

        replacement = self.test_repo / "replacement"
        replacement.mkdir()
        (replacement / "index.html").write_text("<!doctype html><title>Guide v2</title>")
        result = self.deploy(
            replacement,
            "--destination",
            "Guide",
            "--title",
            "Guide",
            "--description",
            "The second publication.",
        )

        replaced = json.loads((destination / "demo.json").read_text())
        self.assertEqual(replaced["initiative"], "repo-guide")
        self.assertTrue(replaced["featured"])
        self.assertEqual(replaced["description"], "The second publication.")
        # Carrying a field silently is how the loss went unnoticed for a release.
        self.assertIn("initiative", result.stdout)
        self.assertIn("featured", result.stdout)
        # The build still accepts what was carried across.
        self.assertEqual(self.metadata("html-field", destination, "Guide", "title"), "Guide")

    def test_a_new_demo_gains_neither_field(self):
        source = self.test_repo / "source"
        source.mkdir()
        (source / "index.html").write_text("<!doctype html><title>Fresh</title>")

        self.deploy(
            source,
            "--destination",
            "Fresh",
            "--title",
            "Fresh",
            "--description",
            "Nothing to carry.",
        )

        manifest = json.loads((self.test_repo / "demos/Fresh/demo.json").read_text())
        self.assertEqual(list(manifest), ["title", "description", "root", "links"])

    def test_an_unreadable_manifest_is_reported_rather_than_fatal(self):
        """Redeploying is how a broken manifest gets fixed, so it must not block.

        The one thing that must not happen is losing a field without saying so.
        """
        source = self.test_repo / "source"
        source.mkdir()
        (source / "index.html").write_text("<!doctype html><title>Broken</title>")
        broken = self.test_repo / "demos" / "Broken"
        broken.mkdir()
        (broken / "demo.json").write_text("{ not json at all")

        result = self.deploy(
            source,
            "--destination",
            "Broken",
            "--title",
            "Broken",
            "--description",
            "Replaced over a broken manifest.",
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn("cannot read the existing demo.json", result.stderr)
        manifest = json.loads((broken / "demo.json").read_text())
        self.assertEqual(manifest["description"], "Replaced over a broken manifest.")

    def test_a_field_the_build_would_reject_is_not_carried(self):
        source = self.test_repo / "source"
        source.mkdir()
        (source / "index.html").write_text("<!doctype html><title>Odd</title>")
        odd = self.test_repo / "demos" / "Odd"
        odd.mkdir()
        (odd / "demo.json").write_text(
            json.dumps({"title": "Odd", "description": "Odd.", "root": "index.html", "featured": "yes"})
        )

        result = self.deploy(
            source,
            "--destination",
            "Odd",
            "--title",
            "Odd",
            "--description",
            "Replaced.",
        )

        self.assertIn("featured is not true or false", result.stderr)
        self.assertNotIn("featured", json.loads((odd / "demo.json").read_text()))

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
