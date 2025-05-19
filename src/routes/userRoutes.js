import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../config/multer.js';

const router = express.Router();
const prisma = new PrismaClient();

// 用户注册
router.post("/", async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "邮箱和密码是必需的" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "邮箱格式不正确" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(409).json({ error: "该邮箱已被注册" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "注册成功",
      status: 201,
      success: true,
      data: newUser,
    });
  } catch (error) {
    console.error("用户注册失败:", error);
    res.status(500).json({ error: "用户注册过程中发生错误" });
  }
});

// 用户登录
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "邮箱和密码是必需的" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res.status(405).json({ message: "用户未注册" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(405).json({ message: "邮箱或密码不正确" });
    }

    const payload = { userId: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("用户登录失败:", error);
    res.status(500).json({ error: "用户登录过程中发生错误" });
  }
});

// 修改密码
router.post("/changePassword", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "旧密码和新密码是必需的" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "新密码长度至少为6位" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "用户未找到" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "旧密码不正确" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    res.status(200).json({ message: "密码修改成功", success: true });
  } catch (error) {
    console.error("修改密码失败:", error);
    res.status(500).json({ error: "修改密码过程中发生错误" });
  }
});

// 更新用户信息
router.patch("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { name, avatar, phoneNumber } = req.body;

  const updateData = {};
  if (name !== undefined) {
    updateData.name = name;
  }
  if (avatar !== undefined) {
    if (avatar === "" || avatar === null ||
        (typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('/')))) {
      updateData.avatar = avatar;
    } else {
      return res.status(400).json({ error: "头像链接格式不正确，应为有效的URL或相对路径，或为空以清除头像" });
    }
  }
  if (phoneNumber !== undefined) {
    if (phoneNumber === "" || (typeof phoneNumber === 'string' && /^[0-9+-]*$/.test(phoneNumber))) {
      updateData.phoneNumber = phoneNumber;
    } else if (phoneNumber !== null) {
      return res.status(400).json({ error: "手机号码格式不正确" });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "未提供任何需要更新的信息" });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: "用户信息更新成功",
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("更新用户信息失败:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: "用户未找到" });
    }
    res.status(500).json({ error: "更新用户信息过程中发生错误" });
  }
});

// 上传头像
router.post("/upload-avatar", authenticateToken, (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: "文件过大，最大允许 5MB" });
      }
      return res.status(400).json({ success: false, message: `Multer错误: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "请选择要上传的图片文件" });
    }

    const userId = req.user.userId;
    const fileUrl = `http://118.178.197.208:9981/public/uploads/avatars/${req.file.filename}`;

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { avatar: fileUrl }
      });

      res.status(200).json({
        success: true,
        data: { url: fileUrl },
        message: "头像上传成功"
      });
    } catch (dbError) {
      console.error("更新用户头像URL失败:", dbError);
      res.status(500).json({ success: false, message: "服务器内部错误，更新头像信息失败" });
    }
  });
});

// 验证 token 并刷新
router.post("/validateToken", authenticateToken, async (req, res) => {
  try {
    const payload = { userId: req.user.userId, email: req.user.email };
    // 重新生成 token
    const newToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        avatar: currentUser.avatar,
        phoneNumber: currentUser.phoneNumber,
      },
    });
  } catch (error) {
    console.error("验证 token 失败:", error);
    res.status(500).json({ error: "验证 token 过程中发生错误" });
  }
});

export default router;