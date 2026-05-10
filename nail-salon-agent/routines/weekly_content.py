import subprocess

result = subprocess.check_output([
    "claude",
    "Create weekly social media plan for nail salon"
]).decode("utf-8")

open("weekly_plan.txt", "w").write(result)