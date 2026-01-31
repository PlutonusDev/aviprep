import { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

type NotificationType = 
  | "course_enrolled"
  | "exam_completed"
  | "course_completed"
  | "purchase"
  | "message"
  | "achievement"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  imageUrl?: string
  metadata?: Prisma.InputJsonValue
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      imageUrl: params.imageUrl,
      metadata: params.metadata as Prisma.InputJsonValue,
    },
  })
}

// Helper functions for common notification types

export async function notifyCourseEnrolled(userId: string, courseName: string, courseId: string) {
  return createNotification({
    userId,
    type: "course_enrolled",
    title: "Course Enrolled",
    message: `You've enrolled in "${courseName}". Start learning now!`,
    link: `/dashboard/learn/${courseId}`,
    metadata: { courseId },
  })
}

export async function notifyExamCompleted(
  userId: string, 
  subjectName: string, 
  score: number, 
  passed: boolean
) {
  return createNotification({
    userId,
    type: "exam_completed",
    title: passed ? "Exam Passed!" : "Exam Completed",
    message: passed 
      ? `Congratulations! You scored ${score}% on ${subjectName}.`
      : `You scored ${score}% on ${subjectName}. Keep practicing!`,
    link: "/dashboard/history",
    metadata: { subjectName, score, passed },
  })
}

export async function notifyCourseCompleted(userId: string, courseName: string, courseId: string) {
  return createNotification({
    userId,
    type: "course_completed",
    title: "Course Completed!",
    message: `Congratulations! You've completed "${courseName}".`,
    link: `/dashboard/learn/${courseId}`,
    metadata: { courseId },
  })
}

export async function notifyPurchase(userId: string, productName: string) {
  return createNotification({
    userId,
    type: "purchase",
    title: "Purchase Successful",
    message: `You now have access to ${productName}. Start studying!`,
    link: "/dashboard/exams",
    metadata: { productName },
  })
}

export async function notifyNewMessage(
  userId: string, 
  senderName: string, 
  senderId: string,
  preview: string
) {
  return createNotification({
    userId,
    type: "message",
    title: "New Message",
    message: `${senderName}: ${preview.slice(0, 100)}${preview.length > 100 ? "..." : ""}`,
    link: `/dashboard/messages?to=${senderId}`,
    metadata: { senderId, senderName },
  })
}

export async function notifyAchievement(userId: string, achievementTitle: string, description: string) {
  return createNotification({
    userId,
    type: "achievement",
    title: achievementTitle,
    message: description,
    link: "/dashboard/statistics",
  })
}
