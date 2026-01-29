"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Mail, Send, Search, Plus, ArrowLeft, Loader2 } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useUser } from "@lib/user-context"
import { cn } from "@lib/utils"

const POLLING_INTERVAL = 3000 // Poll every 3 seconds for new messages

interface User {
  id: string
  firstName: string
  lastName: string
  profilePicture: string | null
}

interface Message {
  id: string
  content: string
  createdAt: string
  sender: User
}

interface Conversation {
  partnerId: string
  partner: User
  lastMessage: { content: string; createdAt: string; senderId: string }
  unreadCount: number
}

export default function MessagesContent() {
  const searchParams = useSearchParams()
  const toUserId = searchParams.get("to")
  const { user } = useUser()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedPartner, setSelectedPartner] = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized fetch functions
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessagesForPartner = useCallback(async (partnerId: string) => {
    try {
      const res = await fetch(`/api/messages/${partnerId}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      
      // Only update if there are new messages
      const newLastId = data.messages[data.messages.length - 1]?.id
      if (newLastId && newLastId !== lastMessageIdRef.current) {
        lastMessageIdRef.current = newLastId
        setMessages(data.messages)
        // Also update partner info in case it changed
        setSelectedPartner(data.partner)
      } else if (!lastMessageIdRef.current && data.messages.length > 0) {
        lastMessageIdRef.current = newLastId
        setMessages(data.messages)
        setSelectedPartner(data.partner)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (toUserId && !selectedPartner) {
      selectConversation(toUserId)
    }
  }, [toUserId])

  // Real-time polling for new messages
  useEffect(() => {
    if (!selectedPartner) {
      // Clear polling when no conversation selected
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    // Start polling for the selected conversation
    pollingRef.current = setInterval(() => {
      fetchMessagesForPartner(selectedPartner.id)
      fetchConversations() // Also refresh conversation list for unread counts
    }, POLLING_INTERVAL)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [selectedPartner, fetchMessagesForPartner])

  // Also poll conversations list when no partner selected
  useEffect(() => {
    if (selectedPartner) return // Already handled above

    const interval = setInterval(() => {
      fetchConversations()
    }, POLLING_INTERVAL * 2) // Poll less frequently for list

    return () => clearInterval(interval)
  }, [selectedPartner])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function selectConversation(partnerId: string) {
    try {
      const res = await fetch(`/api/messages/${partnerId}`)
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setSelectedPartner(data.partner)
      setMessages(data.messages)
      // Track last message for polling
      lastMessageIdRef.current = data.messages[data.messages.length - 1]?.id || null
      fetchConversations() // Refresh unread counts
    } catch (err) {
      console.error(err)
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedPartner) return
    setSending(true)
    const messageContent = newMessage
    setNewMessage("") // Clear immediately for better UX
    
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedPartner.id,
          content: messageContent,
        }),
      })
      if (!res.ok) throw new Error("Failed to send")
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
      lastMessageIdRef.current = msg.id // Update ref so polling doesn't duplicate
      fetchConversations()
    } catch (err) {
      console.error(err)
      setNewMessage(messageContent) // Restore on error
    } finally {
      setSending(false)
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(query)}`)
      if (!res.ok) throw new Error("Failed to search")
      const data = await res.json()
      setSearchResults(data)
    } catch (err) {
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  function startNewConversation(partner: User) {
    setSelectedPartner(partner)
    setMessages([])
    setShowNewChat(false)
    setSearchQuery("")
    setSearchResults([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Private conversations with other members</p>
        </div>
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Conversation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[300px]">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => startNewConversation(result)}
                        className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-secondary"
                      >
                        <Avatar>
                          <AvatarImage src={result.profilePicture || undefined} />
                          <AvatarFallback>
                            {result.firstName[0]}
                            {result.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {result.firstName} {result.lastName}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <p className="py-8 text-center text-muted-foreground">No users found</p>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">Type at least 2 characters to search</p>
                )}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Conversations List */}
        <Card className={cn("lg:col-span-1 overflow-y-auto", selectedPartner && "hidden lg:block")}>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Messages</h3>
                  <p className="text-sm text-muted-foreground">Start a conversation with another member</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.partnerId}
                    onClick={() => selectConversation(conv.partnerId)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-secondary/50",
                      selectedPartner?.id === conv.partnerId && "bg-secondary",
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={conv.partner.profilePicture || undefined} />
                      <AvatarFallback>
                        {conv.partner.firstName[0]}
                        {conv.partner.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {conv.partner.firstName} {conv.partner.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm text-muted-foreground">{conv.lastMessage.content}</p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="ml-2">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className={cn("lg:col-span-2 overflow-y-auto", !selectedPartner && "hidden lg:flex lg:items-center lg:justify-center")}>
          {selectedPartner ? (
            <CardContent className="flex h-full flex-col p-0">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedPartner(null)}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar>
                  <AvatarImage src={selectedPartner.profilePicture || undefined} />
                  <AvatarFallback>
                    {selectedPartner.firstName[0]}
                    {selectedPartner.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">
                  {selectedPartner.firstName} {selectedPartner.lastName}
                </span>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => {
                    const isOwn = msg.sender.id === user?.id
                    return (
                      <div key={msg.id} className={cn("flex", isOwn && "justify-end")}>
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            isOwn ? "bg-primary text-primary-foreground" : "bg-secondary",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={cn(
                              "mt-1 text-xs",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground",
                            )}
                          >
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="flex items-center gap-2 border-t border-border p-4">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Select a Conversation</h3>
              <p className="text-sm text-muted-foreground">Choose a conversation or start a new one</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
