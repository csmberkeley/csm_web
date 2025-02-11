import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def test_task(run_time_str: Optional[str] = None):
    """
    Test task.
    """
    logger.info("<test_task> run_time_str: %s", run_time_str)
    logger.info("<test_task> waiting for 30 seconds")
    time.sleep(30)
    logger.info("<test_task> test_task finished")
