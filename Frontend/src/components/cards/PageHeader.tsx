import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  className?: string
}

export function PageHeader({ title, description, className = "" }: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <h1 className="text-4xl font-bold text-gray-900 dark:text-stone-100 mb-1">{title}</h1>
      {description && (
        <p className="text-lg text-gray-600 dark:text-stone-400">{description}</p>
      )}
    </div>
  )
}

