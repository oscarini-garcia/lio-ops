import React from 'react'

// Chip de persona: iniciales de color, emoji o foto — según su avatar
export default function Avatar({ member, bare = false }) {
  if (!member) return null
  const { avatar = { type: 'initials' }, color, name } = member

  let dot
  if (avatar.type === 'photo' && avatar.value) {
    dot = <span className="dot" style={{ backgroundImage: `url(${avatar.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
  } else if (avatar.type === 'emoji' && avatar.value) {
    dot = <span className="dot emoji">{avatar.value}</span>
  } else {
    dot = <span className="dot" style={{ background: color }}>{(avatar.value || name[0] || '?').toUpperCase().slice(0, 1)}</span>
  }

  if (bare) return dot
  return (
    <span className="avatar">
      {dot}
      {name}
    </span>
  )
}
