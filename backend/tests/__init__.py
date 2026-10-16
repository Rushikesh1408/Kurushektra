"""Local test package.

This file exists for a concrete reason: without it, Python resolves ``tests`` to an unrelated
regular package that happens to be installed in ``site-packages`` on some machines, so imports like
``from tests.conftest import login`` fail. Declaring the local directory as a regular package makes
the project's own tests win the import resolution.
"""
