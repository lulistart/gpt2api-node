# 使用 Node.js 18 LTS 版本
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建数据库目录
RUN mkdir -p database

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"]
