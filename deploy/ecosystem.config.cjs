// PM2: one process serves every store. `pm2 start deploy/ecosystem.config.cjs && pm2 save`
module.exports = {
  apps: [
    {
      name: 'rlc',
      cwd: '/opt/rlc/app/.next/standalone',
      script: 'server.js',
      node_args: '--env-file=/etc/rlc/env --max-old-space-size=256',
      env: { NODE_ENV: 'production', PORT: '3000', HOSTNAME: '127.0.0.1' },
      instances: 1,
      // Spec §8: idle RSS ≤ 300 MB; restart well before the VPS runs out of memory.
      max_memory_restart: '450M',
      out_file: '/var/log/rlc/out.log',
      error_file: '/var/log/rlc/error.log',
      time: true,
    },
  ],
}
