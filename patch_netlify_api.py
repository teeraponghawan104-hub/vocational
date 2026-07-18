import re

with open("netlify/functions/api.ts", "r") as f:
    content = f.read()

content = content.replace('// API endpoints\napp.post("/api/assessments",', '''// API endpoints
const apiRouter = express.Router();

apiRouter.post("/assessments",''')
content = content.replace('app.get("/api/assessments",', 'apiRouter.get("/assessments",')
content = content.replace('app.delete("/api/assessments/:id",', 'apiRouter.delete("/assessments/:id",')
content = content.replace('app.post("/api/sheets/sync",', 'apiRouter.post("/sheets/sync",')

content = content.replace('export const handler = serverless(app);', '''app.use("/api", apiRouter);
app.use("/.netlify/functions/api", apiRouter);

export const handler = serverless(app);''')

with open("netlify/functions/api.ts", "w") as f:
    f.write(content)
