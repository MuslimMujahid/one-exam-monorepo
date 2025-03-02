"""Hello unit test module."""

from apps.proctoring_ai.hello import hello


def test_hello():
    """Test the hello function."""
    assert hello() == "Hello apps/proctoring-ai"
