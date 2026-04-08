import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { Message, Profile } from '../../lib/types'

export function ClientMessages() {
  const { profile } = useAuthContext()
  const [messages, setMessages] = useState<Message[]>([])
  const [coachProfile, setCoachProfile] = useState<Profile | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    loadCoachAndMessages()
  }, [profile])

  useEffect(() => {
    if (!profile || !profile.coach_id) return

    const channel = supabase
      .channel(`client-messages-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as Message
          const isRelevant =
            (msg.sender_id === profile.id && msg.receiver_id === profile.coach_id) ||
            (msg.sender_id === profile.coach_id && msg.receiver_id === profile.id)
          if (isRelevant) {
            setMessages(prev => [...prev, msg])
            if (msg.sender_id === profile.coach_id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadCoachAndMessages() {
    if (!profile || !profile.coach_id) {
      setLoadingMessages(false)
      return
    }

    const [coachRes, messagesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', profile.coach_id).single(),
      supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${profile.coach_id}),and(sender_id.eq.${profile.coach_id},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true }),
    ])

    setCoachProfile(coachRes.data ?? null)
    setMessages(messagesRes.data ?? [])

    // Mark incoming messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', profile.coach_id)
      .eq('receiver_id', profile.id)
      .eq('read', false)

    setLoadingMessages(false)
  }

  async function handleSend() {
    if (!newMessage.trim() || !profile || !profile.coach_id) return
    const body = newMessage.trim()
    setNewMessage('')
    setSending(true)

    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: profile.coach_id,
      body,
      read: false,
    })

    setSending(false)

    // Ask AI coach for a response if coach_id exists
    try {
      setAiLoading(true)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ message: body, clientId: profile.id }),
      })

      if (res.ok) {
        const { reply } = await res.json()
        if (reply && profile.coach_id) {
          await supabase.from('messages').insert({
            sender_id: profile.coach_id,
            receiver_id: profile.id,
            body: reply,
            read: false,
          })
        }
      }
    } catch {
      // AI unavailable — coach will reply manually
    } finally {
      setAiLoading(false)
    }
  }

  if (!profile?.coach_id) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="font-heading text-xl text-brand-deep/30">No coach assigned</p>
          <p className="font-body text-sm text-brand-deep/30 mt-2">
            A coach will be assigned to you soon 💜
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-brand-lavender/10">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-brand-lavender flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-brand-deep flex items-center justify-center text-white font-bold">
          {(coachProfile?.full_name ?? 'C')[0].toUpperCase()}
        </div>
        <div>
          <p className="font-body font-semibold text-brand-deep">
            {coachProfile?.full_name ?? 'Your coach'}
          </p>
          <p className="font-body text-xs text-brand-deep/40">Fem'Active — Premium coaching</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="font-body text-xs text-brand-deep/40">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loadingMessages ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-heading text-xl text-brand-deep/30">Start the conversation 💜</p>
            <p className="font-body text-sm text-brand-deep/30 mt-2">
              Ask your coach a question or share your progress
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
                    {(coachProfile?.full_name ?? 'C')[0].toUpperCase()}
                  </div>
                )}
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl font-body text-sm ${
                    isMe
                      ? 'bg-brand-violet text-white rounded-br-sm'
                      : 'bg-white text-brand-deep border border-brand-lavender rounded-bl-sm shadow-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.body}</p>
                  <p className={`text-xs mt-1.5 ${isMe ? 'text-white/50' : 'text-brand-deep/40'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                    {!isMe && !msg.read && (
                      <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-brand-violet" />
                    )}
                  </p>
                </div>
              </div>
            )
          })
        )}

        {aiLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-brand-deep flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">
              {(coachProfile?.full_name ?? 'C')[0].toUpperCase()}
            </div>
            <div className="bg-white border border-brand-lavender px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-brand-violet/50 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 bg-white border-t border-brand-lavender">
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Write a message to your coach..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-brand-lavender font-body text-sm text-brand-deep
              focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            loading={sending}
          >
            →
          </Button>
        </div>
        <p className="font-body text-xs text-brand-deep/30 mt-2 text-center">
          AI response available 24/7 · Your coach will reply in person within 24h
        </p>
      </div>
    </div>
  )
}
