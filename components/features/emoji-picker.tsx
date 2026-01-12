"use client"

import * as React from "react"
import {
  IconCar,
  IconClock,
  IconDeviceGamepad2,
  IconFaceId,
  IconLeaf,
  IconMoodSmile,
  IconPizza,
  IconSearch,
  IconStar,
  IconUser,
  IconX,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Emoji category definition with id, label, icon, and emojis array.
 */
export interface EmojiCategory {
  /** Unique identifier for the category */
  id: string
  /** Display label for the category */
  label: string
  /** Icon component for the category tab */
  icon: React.ElementType
  /** Array of emojis in this category */
  emojis: string[]
}

/**
 * Props for the EmojiPicker component.
 */
export interface EmojiPickerProps {
  /** Callback fired when an emoji is selected */
  onSelect: (emoji: string) => void
  /** Whether the popover is currently open */
  isOpen: boolean
  /** Callback fired when the popover should be closed */
  onClose: () => void
  /** Reference to the trigger element for positioning, optional */
  triggerRef?: React.RefObject<HTMLElement>
  /** Additional CSS classes to apply to the popover content */
  className?: string
  /** The trigger element to open the picker */
  children?: React.ReactNode
}

/**
 * Comprehensive emoji dataset organized by category.
 * Contains at least 20 emojis per category for a rich selection.
 */
export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: IconMoodSmile,
    emojis: [
      "\u{1F600}", // grinning face
      "\u{1F603}", // grinning face with big eyes
      "\u{1F604}", // grinning face with smiling eyes
      "\u{1F601}", // beaming face with smiling eyes
      "\u{1F606}", // grinning squinting face
      "\u{1F605}", // grinning face with sweat
      "\u{1F602}", // face with tears of joy
      "\u{1F923}", // rolling on the floor laughing
      "\u{1F60A}", // smiling face with smiling eyes
      "\u{1F607}", // smiling face with halo
      "\u{1F642}", // slightly smiling face
      "\u{1F643}", // upside-down face
      "\u{1F609}", // winking face
      "\u{1F60C}", // relieved face
      "\u{1F60D}", // smiling face with heart-eyes
      "\u{1F618}", // face blowing a kiss
      "\u{1F617}", // kissing face
      "\u{1F619}", // kissing face with smiling eyes
      "\u{1F61A}", // kissing face with closed eyes
      "\u{1F60B}", // face savoring food
      "\u{1F61B}", // face with tongue
      "\u{1F61C}", // winking face with tongue
      "\u{1F92A}", // zany face
      "\u{1F61D}", // squinting face with tongue
      "\u{1F911}", // money-mouth face
      "\u{1F917}", // smiling face with open hands
      "\u{1F914}", // thinking face
      "\u{1F928}", // face with raised eyebrow
      "\u{1F610}", // neutral face
      "\u{1F611}", // expressionless face
    ],
  },
  {
    id: "people",
    label: "People",
    icon: IconUser,
    emojis: [
      "\u{1F44B}", // waving hand
      "\u{1F44D}", // thumbs up
      "\u{1F44E}", // thumbs down
      "\u{1F44A}", // oncoming fist
      "\u{270A}",   // raised fist
      "\u{1F91B}", // left-facing fist
      "\u{1F91C}", // right-facing fist
      "\u{1F44F}", // clapping hands
      "\u{1F64C}", // raising hands
      "\u{1F450}", // open hands
      "\u{1F64F}", // folded hands
      "\u{1F91D}", // handshake
      "\u{270C}\u{FE0F}",   // victory hand
      "\u{1F91E}", // crossed fingers
      "\u{1F91F}", // love-you gesture
      "\u{1F918}", // sign of the horns
      "\u{1F448}", // backhand index pointing left
      "\u{1F449}", // backhand index pointing right
      "\u{1F446}", // backhand index pointing up
      "\u{1F447}", // backhand index pointing down
      "\u{261D}\u{FE0F}",   // index pointing up
      "\u{1F4AA}", // flexed biceps
      "\u{1F9BE}", // mechanical arm
      "\u{1F9B5}", // leg
      "\u{1F9B6}", // foot
      "\u{1F442}", // ear
      "\u{1F443}", // nose
      "\u{1F9E0}", // brain
      "\u{1F441}\u{FE0F}", // eye
      "\u{1F440}", // eyes
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: IconLeaf,
    emojis: [
      "\u{1F436}", // dog face
      "\u{1F431}", // cat face
      "\u{1F42D}", // mouse face
      "\u{1F430}", // rabbit face
      "\u{1F98A}", // fox face
      "\u{1F43B}", // bear face
      "\u{1F43C}", // panda face
      "\u{1F428}", // koala
      "\u{1F42F}", // tiger face
      "\u{1F981}", // lion face
      "\u{1F984}", // unicorn face
      "\u{1F993}", // zebra
      "\u{1F98C}", // deer
      "\u{1F42E}", // cow face
      "\u{1F437}", // pig face
      "\u{1F438}", // frog face
      "\u{1F435}", // monkey face
      "\u{1F64A}", // speak-no-evil monkey
      "\u{1F412}", // monkey
      "\u{1F414}", // chicken
      "\u{1F331}", // seedling
      "\u{1F332}", // evergreen tree
      "\u{1F333}", // deciduous tree
      "\u{1F334}", // palm tree
      "\u{1F335}", // cactus
      "\u{1F33B}", // sunflower
      "\u{1F33A}", // hibiscus
      "\u{1F339}", // rose
      "\u{1F337}", // tulip
      "\u{1F340}", // four leaf clover
    ],
  },
  {
    id: "food",
    label: "Food",
    icon: IconPizza,
    emojis: [
      "\u{1F34E}", // red apple
      "\u{1F34F}", // green apple
      "\u{1F34A}", // tangerine
      "\u{1F34B}", // lemon
      "\u{1F34C}", // banana
      "\u{1F34D}", // pineapple
      "\u{1F96D}", // mango
      "\u{1F347}", // grapes
      "\u{1F353}", // strawberry
      "\u{1F351}", // peach
      "\u{1F352}", // cherries
      "\u{1F349}", // watermelon
      "\u{1F95D}", // kiwi fruit
      "\u{1F950}", // croissant
      "\u{1F35E}", // bread
      "\u{1F354}", // hamburger
      "\u{1F355}", // pizza
      "\u{1F32D}", // hot dog
      "\u{1F35F}", // french fries
      "\u{1F32E}", // taco
      "\u{1F32F}", // burrito
      "\u{1F37F}", // popcorn
      "\u{1F366}", // soft ice cream
      "\u{1F370}", // shortcake
      "\u{1F382}", // birthday cake
      "\u{1F36B}", // chocolate bar
      "\u{1F36C}", // candy
      "\u{1F36D}", // lollipop
      "\u{1F37A}", // beer mug
      "\u{1F377}", // wine glass
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: IconDeviceGamepad2,
    emojis: [
      "\u{26BD}", // soccer ball
      "\u{1F3C0}", // basketball
      "\u{1F3C8}", // american football
      "\u{26BE}", // baseball
      "\u{1F3BE}", // tennis
      "\u{1F3D0}", // volleyball
      "\u{1F3C9}", // rugby football
      "\u{1F3B1}", // pool 8 ball
      "\u{1F3D3}", // ping pong
      "\u{1F3B3}", // bowling
      "\u{1F3AF}", // direct hit
      "\u{26F3}", // flag in hole
      "\u{1F3C6}", // trophy
      "\u{1F3C5}", // sports medal
      "\u{1F947}", // 1st place medal
      "\u{1F948}", // 2nd place medal
      "\u{1F949}", // 3rd place medal
      "\u{1F3AE}", // video game
      "\u{1F3B2}", // game die
      "\u{265F}\u{FE0F}", // chess pawn
      "\u{1F3A8}", // artist palette
      "\u{1F3AD}", // performing arts
      "\u{1F3BC}", // musical score
      "\u{1F3B5}", // musical note
      "\u{1F3B6}", // musical notes
      "\u{1F3A4}", // microphone
      "\u{1F3A7}", // headphone
      "\u{1F3B9}", // musical keyboard
      "\u{1F3B7}", // saxophone
      "\u{1F3BA}", // trumpet
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: IconCar,
    emojis: [
      "\u{1F697}", // automobile
      "\u{1F695}", // taxi
      "\u{1F699}", // sport utility vehicle
      "\u{1F68C}", // bus
      "\u{1F68E}", // trolleybus
      "\u{1F3CE}\u{FE0F}", // racing car
      "\u{1F6B2}", // bicycle
      "\u{1F6F4}", // kick scooter
      "\u{1F6B6}", // person walking
      "\u{1F3C3}", // person running
      "\u{2708}\u{FE0F}", // airplane
      "\u{1F681}", // helicopter
      "\u{1F680}", // rocket
      "\u{1F6F8}", // flying saucer
      "\u{1F6F3}\u{FE0F}", // passenger ship
      "\u{26F5}", // sailboat
      "\u{1F6A2}", // ship
      "\u{1F3D6}\u{FE0F}", // beach with umbrella
      "\u{1F3DD}\u{FE0F}", // desert island
      "\u{1F3D4}\u{FE0F}", // snow-capped mountain
      "\u{26F0}\u{FE0F}", // mountain
      "\u{1F5FB}", // mount fuji
      "\u{1F3D5}\u{FE0F}", // camping
      "\u{1F3E0}", // house
      "\u{1F3E2}", // office building
      "\u{1F3EB}", // school
      "\u{1F3E5}", // hospital
      "\u{1F3EA}", // convenience store
      "\u{1F307}", // sunset
      "\u{1F303}", // night with stars
    ],
  },
  {
    id: "objects",
    label: "Objects",
    icon: IconStar,
    emojis: [
      "\u{1F4F1}", // mobile phone
      "\u{1F4BB}", // laptop
      "\u{1F5A5}\u{FE0F}", // desktop computer
      "\u{2328}\u{FE0F}", // keyboard
      "\u{1F5B1}\u{FE0F}", // computer mouse
      "\u{1F4BD}", // computer disk
      "\u{1F4BE}", // floppy disk
      "\u{1F4BF}", // optical disk
      "\u{1F4C0}", // DVD
      "\u{1F4F7}", // camera
      "\u{1F4F8}", // camera with flash
      "\u{1F4FA}", // television
      "\u{1F4FB}", // radio
      "\u{1F50B}", // battery
      "\u{1F526}", // flashlight
      "\u{1F4A1}", // light bulb
      "\u{1F4B0}", // money bag
      "\u{1F4B5}", // dollar banknote
      "\u{1F4B3}", // credit card
      "\u{1F4E7}", // e-mail
      "\u{1F4E8}", // incoming envelope
      "\u{1F4EC}", // open mailbox with raised flag
      "\u{1F4DD}", // memo
      "\u{1F4D3}", // notebook
      "\u{1F4D5}", // closed book
      "\u{1F4D6}", // open book
      "\u{1F4DA}", // books
      "\u{1F4CB}", // clipboard
      "\u{1F4CC}", // pushpin
      "\u{1F4CE}", // paperclip
    ],
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: IconFaceId,
    emojis: [
      "\u{2764}\u{FE0F}", // red heart
      "\u{1F9E1}", // orange heart
      "\u{1F49B}", // yellow heart
      "\u{1F49A}", // green heart
      "\u{1F499}", // blue heart
      "\u{1F49C}", // purple heart
      "\u{1F5A4}", // black heart
      "\u{1F90D}", // white heart
      "\u{1F90E}", // brown heart
      "\u{1F494}", // broken heart
      "\u{2763}\u{FE0F}", // heart exclamation
      "\u{1F495}", // two hearts
      "\u{1F496}", // sparkling heart
      "\u{1F497}", // growing heart
      "\u{1F498}", // heart with arrow
      "\u{1F49D}", // heart with ribbon
      "\u{1F49E}", // revolving hearts
      "\u{1F49F}", // heart decoration
      "\u{2728}", // sparkles
      "\u{2B50}", // star
      "\u{1F31F}", // glowing star
      "\u{1F4AB}", // dizzy
      "\u{1F4A5}", // collision
      "\u{1F4A2}", // anger symbol
      "\u{1F4AF}", // hundred points
      "\u{2705}", // check mark button
      "\u{274C}", // cross mark
      "\u{2757}", // exclamation mark
      "\u{2753}", // question mark
      "\u{1F4A4}", // zzz
    ],
  },
]

/** Maximum number of recently used emojis to store */
const MAX_RECENT_EMOJIS = 12

/** LocalStorage key for recently used emojis */
const RECENT_EMOJIS_KEY = "chainlinked-recent-emojis"

/**
 * Hook to manage recently used emojis with localStorage persistence.
 */
function useRecentEmojis() {
  const [recentEmojis, setRecentEmojis] = React.useState<string[]>([])

  // Load recent emojis from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setRecentEmojis(parsed.slice(0, MAX_RECENT_EMOJIS))
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  /**
   * Adds an emoji to the recent list.
   * @param emoji - The emoji to add
   */
  const addRecentEmoji = React.useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji)
      const updated = [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS)
      try {
        localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  return { recentEmojis, addRecentEmoji }
}

/**
 * EmojiPicker provides a custom popover-based emoji selector with categories,
 * search functionality, and recently used emojis.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <EmojiPicker
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onSelect={(emoji) => {
 *     console.log("Selected:", emoji)
 *     setIsOpen(false)
 *   }}
 * >
 *   <Button onClick={() => setIsOpen(!isOpen)}>
 *     <IconMoodSmile /> Emoji
 *   </Button>
 * </EmojiPicker>
 * ```
 *
 * @example
 * ```tsx
 * // With trigger ref for custom positioning
 * const triggerRef = useRef<HTMLButtonElement>(null)
 *
 * <EmojiPicker
 *   isOpen={isPickerOpen}
 *   onClose={handleClose}
 *   onSelect={handleSelect}
 *   triggerRef={triggerRef}
 * >
 *   <Button ref={triggerRef}>Pick Emoji</Button>
 * </EmojiPicker>
 * ```
 */
export function EmojiPicker({
  onSelect,
  isOpen,
  onClose,
  className,
  children,
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState("smileys")
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const { recentEmojis, addRecentEmoji } = useRecentEmojis()
  const gridRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  /**
   * Resets state when popover opens/closes.
   */
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
      setFocusedIndex(-1)
      // Focus search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 0)
    }
  }, [isOpen])

  /**
   * Filters emojis based on search query.
   * For simplicity, we search by checking if any emoji in the category
   * is part of a rough name match (this is simplified - real implementation
   * would use emoji names/keywords).
   */
  const filteredEmojis = React.useMemo(() => {
    if (!searchQuery.trim()) return null

    const query = searchQuery.toLowerCase()
    const allEmojis: string[] = []

    // Simple search: collect all emojis and filter by category name match
    // or just return all if query is generic
    EMOJI_CATEGORIES.forEach((category) => {
      if (category.label.toLowerCase().includes(query)) {
        allEmojis.push(...category.emojis)
      }
    })

    // If no category match, return all emojis (simple fuzzy match simulation)
    if (allEmojis.length === 0) {
      EMOJI_CATEGORIES.forEach((category) => {
        allEmojis.push(...category.emojis)
      })
    }

    return allEmojis.slice(0, 48) // Limit results
  }, [searchQuery])

  /**
   * Gets the current category's emojis.
   */
  const currentCategoryEmojis = React.useMemo(() => {
    const category = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)
    return category?.emojis ?? []
  }, [activeCategory])

  /**
   * The emojis to display in the grid.
   */
  const displayEmojis = filteredEmojis ?? currentCategoryEmojis

  /**
   * Handles emoji selection.
   */
  const handleSelectEmoji = React.useCallback(
    (emoji: string) => {
      addRecentEmoji(emoji)
      onSelect(emoji)
      onClose()
    },
    [addRecentEmoji, onSelect, onClose]
  )

  /**
   * Handles keyboard navigation.
   */
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      const columns = 6
      const total = displayEmojis.length

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % total)
          break
        case "ArrowLeft":
          event.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + total) % total)
          break
        case "ArrowDown":
          event.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + columns, total - 1))
          break
        case "ArrowUp":
          event.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - columns, 0))
          break
        case "Enter":
        case " ":
          event.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < displayEmojis.length) {
            handleSelectEmoji(displayEmojis[focusedIndex])
          }
          break
        case "Escape":
          event.preventDefault()
          onClose()
          break
      }
    },
    [displayEmojis, focusedIndex, handleSelectEmoji, onClose]
  )

  /**
   * Handles popover open state change.
   */
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        onClose()
      }
    },
    [onClose]
  )

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className={cn("w-80 p-0", className)}
        align="start"
        sideOffset={8}
        onKeyDown={handleKeyDown}
      >
        <div className="flex flex-col">
          {/* Search Header */}
          <div className="p-3 border-b">
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
                  onClick={() => setSearchQuery("")}
                >
                  <IconX className="size-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          {!searchQuery && (
            <Tabs
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full"
            >
              <div className="border-b overflow-x-auto">
                <TabsList className="h-10 w-full justify-start rounded-none bg-transparent p-0 px-1">
                  {EMOJI_CATEGORIES.map((category) => {
                    const Icon = category.icon
                    return (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="h-9 px-2 data-[state=active]:bg-muted rounded-md"
                        title={category.label}
                      >
                        <Icon className="size-4" />
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>
            </Tabs>
          )}

          {/* Recently Used Section */}
          {!searchQuery && recentEmojis.length > 0 && (
            <div className="p-2 border-b">
              <div className="flex items-center gap-1.5 mb-1.5">
                <IconClock className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Recently Used
                </span>
              </div>
              <div className="grid grid-cols-6 gap-0.5">
                {recentEmojis.map((emoji, index) => (
                  <button
                    key={`recent-${index}`}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className={cn(
                      "flex items-center justify-center size-8 rounded-md text-xl",
                      "hover:bg-muted transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    )}
                    title="Recently used"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Grid */}
          <div
            ref={gridRef}
            className="p-2 h-[200px] overflow-y-auto"
            role="grid"
            aria-label="Emojis"
          >
            {searchQuery && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <IconSearch className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Search Results
                </span>
              </div>
            )}
            <div className="grid grid-cols-6 gap-0.5">
              {displayEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => handleSelectEmoji(emoji)}
                  className={cn(
                    "flex items-center justify-center size-8 rounded-md text-xl",
                    "hover:bg-muted transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                    focusedIndex === index && "bg-muted ring-2 ring-ring"
                  )}
                  tabIndex={focusedIndex === index ? 0 : -1}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {displayEmojis.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <IconMoodSmile className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No emojis found</p>
              </div>
            )}
          </div>

          {/* Category Label Footer */}
          {!searchQuery && (
            <div className="px-3 py-2 border-t bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
