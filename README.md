需求：做一个论坛+wiki的平台
1 管理员：创建论坛版块、增删人员，配置人员可以查看论坛，而公开版块游客也可以看）
2 wiki 每个人员都有一个私有Wiki空间（支持目录到Markdown文章）
3 可以像wiki的的单个文章，或勾选多个文章做成共享链接（支持选择分享过期时间）
4 论坛贴子支持加入wiki链接，点击链接论坛在左侧，wiki在右侧显示；关闭wiki链接后，论坛在左侧，wiki在右侧隐藏。
5 可以使用ai问答，问答权限版块中的问题（作为以后的扩展功能）

按上面的需给，给出初步的技术方案，技术选型为next.js

当前数据库使用 postgresql16 连接相关信息为：
'USER': 'postgres',
'PASSWORD': 'xxx',
'HOST': 'localhost',
'PORT': '5432',
需要按自己的数据库配置更改.env文件中的数据库连接信息。

工程管理工具: pnpm
多语言：i8n

运行方式
```
  pnpm dev              # 开发模式
  pnpm build            # 生产构建
  pnpm db:seed          # 初始化数据（管理员账号）

  默认管理员账号：admin@bbs-wiki.com / admin123
  数据库：PostgreSQL localhost:56433，数据库名 bbs_wiki

  图像存储：用户头像存在 public/uploads/avatars/{userId}/，Wiki图片存在 public/uploads/wiki/{userId}/。
```