"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { userInitials } from "@/app/ui/calendar/draft-utils"
import type { ListedUser } from "@/app/ui/calendar/types"

function UserAvatar({ user, className }: { user: ListedUser; className?: string }) {
  const url = user.photoURL?.trim()
  const size = className ?? "h-6 w-6"
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`shrink-0 rounded-full object-cover ${size}`}
        width={24}
        height={24}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 ${size}`}
      aria-hidden
    >
      {userInitials(user)}
    </span>
  )
}

export function ScheduleUserPicker({
  users,
  selectedUserIds,
  onSelectedChange,
}: {
  users: ListedUser[]
  selectedUserIds: string[]
  onSelectedChange: (ids: string[]) => void
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds])

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => {
        if (selectedSet.has(u.firebaseUid)) return false
        if (!q) return true
        return u.email.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q)
      })
      .slice(0, 25)
  }, [users, selectedSet, search])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const pick = (uid: string) => {
    if (selectedUserIds.includes(uid)) return
    onSelectedChange([...selectedUserIds, uid])
    setSearch("")
    inputRef.current?.focus()
  }

  const remove = (uid: string) => onSelectedChange(selectedUserIds.filter((id) => id !== uid))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="text-xs font-medium text-cyan-800 underline decoration-cyan-600/40 hover:decoration-cyan-700"
          onClick={() => onSelectedChange(users.map((u) => u.firebaseUid))}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-xs font-medium text-gray-600 underline decoration-gray-400 hover:decoration-gray-700"
          onClick={() => onSelectedChange([])}
        >
          Clear selection
        </button>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
        <span className="shrink-0 pt-2 text-sm font-medium text-gray-800 sm:w-28">Select user</span>
        <div ref={wrapRef} className="relative min-w-0 flex-1">
          <div
            className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-md border border-gray-400 bg-white px-2 py-1.5 shadow-sm focus-within:border-cyan-600 focus-within:ring-1 focus-within:ring-cyan-600"
            onClick={() => inputRef.current?.focus()}
            role="group"
            aria-label="Search and select users"
          >
            {selectedUserIds.map((id) => {
              const u = users.find((x) => x.firebaseUid === id)
              if (!u) return null
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-400 bg-white py-0.5 pl-1 pr-0.5 shadow-sm"
                >
                  <UserAvatar user={u} />
                  <span className="flex min-w-0 flex-col text-left leading-tight">
                    <span className="max-w-[220px] truncate text-xs font-medium text-gray-900 sm:max-w-[280px]">
                      {u.displayName?.trim() ? u.displayName.trim() : u.email}
                    </span>
                    {u.displayName?.trim() ? (
                      <span className="max-w-[220px] truncate text-[11px] text-gray-500 sm:max-w-[280px]">
                        {u.email}
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    aria-label={`Remove ${u.email}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(id)
                    }}
                  >
                    ×
                  </button>
                </span>
              )
            })}
            <input
              ref={inputRef}
              type="text"
              className="min-w-[10rem] flex-1 border-0 bg-transparent py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              placeholder={selectedUserIds.length ? "Add another…" : "Search by name or email…"}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && search === "" && selectedUserIds.length > 0) {
                  e.preventDefault()
                  onSelectedChange(selectedUserIds.slice(0, -1))
                }
                if (e.key === "Escape") setOpen(false)
              }}
            />
          </div>
          {open && suggestions.length > 0 ? (
            <ul
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              role="listbox"
            >
              {suggestions.map((u) => (
                <li key={u.firebaseUid} role="presentation">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    role="option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(u.firebaseUid)}
                  >
                    <UserAvatar user={u} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-gray-900">
                        {u.displayName?.trim() || u.email}
                      </span>
                      {u.displayName?.trim() ? (
                        <span className="block truncate text-xs text-gray-500">{u.email}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {open && search.trim() && suggestions.length === 0 ? (
            <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
              No matches.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
