'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useState, useTransition, type ReactNode } from 'react'
import { Icon } from './icon'

type Item = { id: string; content: ReactNode; indent?: number }

const Row = ({ item, handleLabel }: { item: Item; handleLabel: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
        transition,
        marginLeft: (item.indent ?? 0) * 24,
      }}
      className="flex min-h-14 items-center gap-2 rounded-card border border-line bg-surface p-2 data-[dragging=true]:shadow-lg"
      data-dragging={isDragging}
    >
      <button
        type="button"
        aria-label={handleLabel}
        className="inline-flex size-11 shrink-0 cursor-grab items-center justify-center text-muted"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" />
      </button>
      {item.content}
    </li>
  )
}

/** Drag (mouse/touch) or keyboard (Space, arrows, Space) to reorder; saves the new order. */
export const SortableList = ({
  items,
  onReorder,
  handleLabel,
}: {
  items: Item[]
  onReorder: (ids: string[]) => Promise<unknown>
  handleLabel: string
}) => {
  // Keep only the drag order locally; content always comes from fresh server props,
  // so renames and newly added rows show up after an action revalidates the page.
  const [ids, setIds] = useState<string[]>([])
  const rank = (id: string) => (ids.includes(id) ? ids.indexOf(id) : ids.length)
  const order = [...items].sort((a, b) => rank(a.id) - rank(b.id))
  const [, start] = useTransition()
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const end = ({ active, over: target }: DragEndEvent) => {
    // closestCenter always finds a row while the list has any, so a drop has a target.
    const over = target!
    if (active.id === over.id) return
    const next = arrayMove(
      order,
      order.findIndex((i) => i.id === active.id),
      order.findIndex((i) => i.id === over.id),
    )
    setIds(next.map((i) => i.id))
    start(() => void onReorder(next.map((i) => i.id)))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {order.map((i) => (
            <Row key={i.id} item={i} handleLabel={handleLabel} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
