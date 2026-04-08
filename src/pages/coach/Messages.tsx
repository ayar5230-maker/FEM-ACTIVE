import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthContext } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/Spinner'
import type { Profile, Message } from '../../lib/types'

export function CoachMessages() {
  const { profile } = useAuthContext()
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState<Profile[]>([])
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profile) return
    loadClients()
  }, [profile])

  useEffect(() => {
    const clientId = searchParams.get('client')
    if (clientId && clients.length > 0) {
      const c = clients.find(c => c.id === clientId)
      if (c) setSelectedClient(c)
    }
  }, [searchParams, clients])

  useEffect(() => {
    if (!selectedClient || !profile) return
    loadMessages()
    markAsRead()

    const channel = supabase
      .channel(`messages-${profile.id}-${selectedClient.id}`)
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
            (msg.sender_id === profile.id && msg.receiver_id === selectedClient.id) ||
            (msg.sender_id === selectedClient.id && msg.receiver_id === profile.id)
          if (isRelevant) {
            setMessages(prev => [...prev, msg])
            if (msg.sender_id === selectedClient.id) {
              supabase.from('messages').update({ read: true }).eq('id', msg.id)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedClient, profile])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadClients() {
    if (!profile) return
    setLoadingClients(true)
    const { data } = await supabase.from('profiles').select('*').eq('role', 'client').eq('coach_id', profile.id)
    setClients(data ?? [])
    setLoadingClients(false)
  }

  async function loadMessages() {
    if (!profile || !selectedClient) return
    setLoadingMessages(true)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${selectedClient.id}),and(sender_id.eq.${selectedClient.id},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    setLoadingMessages(false)
  }

  async function markAsRead() {
    if (!profile || !selectedClient) return
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', selectedClient.id)
      .eq('receiver_id', profile.id)
      .eq('read', false)
  }

  async function handleSend() {
    if (!newMessage.trim() || !profile || !selectedClient) return
    setSending(true)
    await supabase.from('messages').insert({
      sender_id: profile.id,
      receiver_id: selectedClient.id,
      body: newMessage.trim(),
      read: false,
    })
    setNewMessage('')
    setSending(false)
  }

  return (
    <div className="flex h-screen bg-brand-lavender/20">
      {/* Client list */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-brand-lavender flex flex-col">
        <div className="px-5 py-5 border-b border-brand-lavender">
          <h1 className="font-heading text-xl font-semibold text-brand-deep">Messages</h1>
        </div>

        {loadingClients ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : clients.length === 0 ? (
          <p className="font-body text-sm text-brand-deep/40 text-center py-6 px-4">
            Aucune cliente pour le moment
          </p>
        ) : (
          <div className="overflow-y-auto flex-1">
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`w-full flex items-center gap-3 px-4 py-4 border-b border-brand-lavender/50 transition-colors text-left ${
                  selectedClient?.id === client.id
                    ? 'bg-brand-lavender/60'
                    : 'hover:bg-brand-lavender/30'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-brand-deep flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(client.full_name ?? 'C')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-brand-deep truncate">
                    {client.full_name ?? client.email}
                  </p>
                  <p className="font-body text-xs text-brand-deep/40 truncate">
                    {client.forfait ?? 'Cliente'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col">
        {!selectedClient ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="font-body text-brand-deep/30">Sélectionne une cliente pour voir la conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-brand-lavender flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-deep flex items-center justify-center text-white text-sm font-bold">
                {(selectedClient.full_name ?? 'C')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-body font-medium text-brand-deep">{selectedClient.full_name ?? selectedClient.email}</p>
                <p className="font-body text-xs text-brand-deep/40">{selectedClient.forfait ?? 'Cliente'}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : messages.length === 0 ? (
                <p className="text-center font-body text-sm text-brand-deep/30">
                  Commence la conversation ✨
                </p>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === profile?.id
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl font-body text-sm ${
                          isMe
                            ? 'bg-brand-violet text-white rounded-br-sm'
                            : 'bg-white text-brand-deep border border-brand-lavender rounded-bl-sm'
                        }`}
                      >
                        <p>{msg.body}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/50' : 'text-brand-deep/40'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
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
                  placeholder="Écris ton message..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-brand-lavender font-body text-sm text-brand-deep
                    focus:outline-none focus:ring-2 focus:ring-brand-violet/30 focus:border-brand-violet"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violet-dark text-white rounded-xl
                    font-body text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? <Spinner size="sm" /> : '→'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
