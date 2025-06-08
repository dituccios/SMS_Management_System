# 🚀 **PRODUCTION DEPLOYMENT GUIDE**

## **Prerequisites**

### **System Requirements**
- Node.js 18+ and npm 8+
- PostgreSQL 14+
- Redis 6+ (optional, for caching)
- Docker 20+ and Docker Compose 3.8+
- Git 2.30+

### **Infrastructure Requirements**
- **Minimum**: 2 CPU cores, 4GB RAM, 50GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB storage
- **Production**: 8 CPU cores, 16GB RAM, 200GB storage

## **Step-by-Step Deployment**

### **1. Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install redis-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### **2. Database Setup**
```bash
# Create database user
sudo -u postgres createuser --interactive sms_prod_user

# Create database
sudo -u postgres createdb sms_production

# Set password
sudo -u postgres psql
ALTER USER sms_prod_user PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE sms_production TO sms_prod_user;
\q
```

### **3. Application Deployment**
```bash
# Clone repository
git clone https://github.com/yourusername/SMS_Management_System.git
cd SMS_Management_System

# Copy environment files
cp backend/.env.example backend/.env
cp frontend-nextjs/.env.example frontend-nextjs/.env.local

# Edit environment files with production values
nano backend/.env
nano frontend-nextjs/.env.local

# Install dependencies and build
./build.sh --production

# Run database migrations
cd backend
npx prisma migrate deploy
npx prisma generate
npx prisma db seed

# Start application
cd ..
docker-compose up -d
```

### **4. SSL Certificate Setup**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### **5. Reverse Proxy Configuration**
```nginx
# /etc/nginx/sites-available/sms-app
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **6. Process Management**
```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'sms-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'sms-frontend',
      cwd: './frontend-nextjs',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

# Start applications with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## **Monitoring Setup**

### **Application Monitoring**
```bash
# Install monitoring stack
docker-compose -f monitoring/docker-compose.yml up -d

# Configure Grafana dashboards
# Access: http://your-domain.com:3000
# Default: admin/admin123
```

### **Log Management**
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/sms-app

# Content:
/var/log/sms-app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## **Backup Configuration**

### **Database Backup**
```bash
# Create backup script
cat > /usr/local/bin/backup-sms-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sms"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -h localhost -U sms_prod_user sms_production | gzip > $BACKUP_DIR/sms_db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "sms_db_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sms-db.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-sms-db.sh" | sudo crontab -
```

### **File Backup**
```bash
# Create file backup script
cat > /usr/local/bin/backup-sms-files.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sms"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/path/to/SMS_Management_System"

tar -czf $BACKUP_DIR/sms_files_$DATE.tar.gz $APP_DIR/backend/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "sms_files_*.tar.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sms-files.sh

# Schedule weekly file backups
echo "0 3 * * 0 /usr/local/bin/backup-sms-files.sh" | sudo crontab -
```

## **Security Hardening**

### **Firewall Configuration**
```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **Fail2Ban Setup**
```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure Fail2Ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Add SMS app protection
cat > /etc/fail2ban/jail.d/sms-app.conf << EOF
[sms-app]
enabled = true
port = 80,443
filter = sms-app
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

## **Health Checks**

### **Application Health**
```bash
# Create health check script
cat > /usr/local/bin/health-check.sh << 'EOF'
#!/bin/bash

# Check frontend
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "Frontend health check failed"
    exit 1
fi

# Check backend
if ! curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
    echo "Backend health check failed"
    exit 1
fi

# Check database
if ! pg_isready -h localhost -U sms_prod_user > /dev/null 2>&1; then
    echo "Database health check failed"
    exit 1
fi

echo "All services healthy"
EOF

chmod +x /usr/local/bin/health-check.sh

# Schedule health checks
echo "*/5 * * * * /usr/local/bin/health-check.sh" | crontab -
```

## **Troubleshooting**

### **Common Issues**
1. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check connection
   psql -h localhost -U sms_prod_user -d sms_production
   ```

2. **Application Not Starting**
   ```bash
   # Check logs
   pm2 logs
   docker-compose logs
   
   # Check ports
   sudo netstat -tlnp | grep :3000
   sudo netstat -tlnp | grep :3001
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   sudo certbot certificates
   
   # Renew certificate
   sudo certbot renew
   ```

## **Maintenance**

### **Regular Maintenance Tasks**
- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly performance reviews
- [ ] Annual security audits
- [ ] Database maintenance and optimization
- [ ] Log cleanup and archival
- [ ] Backup verification
- [ ] SSL certificate renewal

### **Update Procedure**
```bash
# 1. Backup current version
./scripts/backup.sh

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
npm install

# 4. Run migrations
npx prisma migrate deploy

# 5. Build and restart
./build.sh --production
pm2 restart all

# 6. Verify deployment
./scripts/health-check.sh
```
