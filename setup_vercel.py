import os

os.makedirs('api', exist_ok=True)

with open('api/index.ts', 'w', encoding='utf-8') as f:
    f.write("""import app from '../backend/src/index';

export default app;
""")

with open('package.json', 'w', encoding='utf-8') as f:
    f.write("""{
  "name": "reachinbox-scheduler-monorepo",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "vercel-build": "cd backend && npm install && npx prisma generate && npx prisma db push && cd ../frontend && npm install && npm run build"
  }
}
""")

with open('vercel.json', 'w', encoding='utf-8') as f:
    f.write("""{
  "version": 2,
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/admin/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
""")

print("Vercel fullstack monorepo configs created!")
