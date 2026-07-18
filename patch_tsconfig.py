import json

with open("tsconfig.json", "r") as f:
    data = json.load(f)

if "exclude" not in data:
    data["exclude"] = []
data["exclude"].append("dist")
data["exclude"].append("node_modules")

with open("tsconfig.json", "w") as f:
    json.dump(data, f, indent=2)

