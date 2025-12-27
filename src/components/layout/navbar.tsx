"use client";

import { SignedIn, SignedOut, useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../ui/button";
import { BellIcon, LogInIcon, MenuIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { apiGet, createBrowserApiClient } from "@/lib/api-client";
import { useNotificationCount } from "@/hooks/use-notification-count";
import { toast } from "sonner";
import { Notification } from "@/types/notification";

const navItems = [
  {
    href: "/chat",
    label: "Chat",
    match: (p?: string | null) => p?.startsWith("chat"),
  },
  {
    href: "/profile",
    label: "Profile",
    match: (p?: string | null) => p?.startsWith("profile"),
  },
];

const renderNavlinks = (item: (typeof navItems)[number]) => {
  return (
    <Link
      key={item.href}
      href={item.href}
      className="flex items-center px-3 py-2 text-sm font-medium transition-colors bg-primary/20 text-primary rounded-full shadow-sm"
    >
      {item.label}
    </Link>
  );
};

export default function Navbar() {
  // const [unReadCount, setUnReadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { userId, getToken } = useAuth();
  const { socket } = useSocket();

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken]);

  const { unreadCount, setUnreadCount, incrementUnread } =
    useNotificationCount();

  useEffect(() => {
    let isMounted = true;

    async function loadUnreadNotifications() {
      if (!userId) {
        if (isMounted) setUnreadCount(0);
        return;
      }

      try {
        const data = await apiGet<Notification[]>(
          apiClient,
          "/api/notifications?unreadOnly=true"
        );

        if (!isMounted) return;
        console.log(data);

        setUnreadCount(data.length);
      } catch (e) {
        if (!isMounted) return;
        console.log(`Error ocuured`);
      }
    }

    loadUnreadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNewNotification = (payload: Notification) => {
      incrementUnread();

      toast("New Notification", {
        description:
          payload.type === "REPLY_ON_THREAD"
            ? `${payload.actor.handle ?? "Someone"} commented to your thread`
            : `${payload.actor.handle ?? "Someone"} liked your thread`,
      });
    };

    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, incrementUnread]);

  return (
    <header className="sticky z-40 top-0 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6 ">
          <Link
            href={"/"}
            className="felx items-center gap-2 font-bold text-lg text-sidebar-foreground"
          >
            <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Ace
            </span>
            <span className="text-foreground/90">Forum</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex ">
            {navItems.map(renderNavlinks)}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4 ">
          <SignedIn>
            <Link href={"/notifications"}>
              <Button variant={"outline"} className="relative" size={"icon"}>
                <BellIcon className="size-4" />
                <span className="absolute translate-y-.5 translate-x-1 -right-1 -top-1 inline-flex min-w-5 min-h-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-primary/40">
                  {unreadCount > 0 ? unreadCount : 0}
                </span>
              </Button>
            </Link>

            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <SignedOut>
            <Link href={"/sign-in"}>
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/90"
                size={"default"}
              >
                <LogInIcon />
                Sign In
              </Button>
            </Link>
          </SignedOut>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-muted-foreground transition-colors duration-200 md:hidden"
          >
            {mobileMenuOpen ? (
              <XIcon className="size-4" />
            ) : (
              <MenuIcon className="size-4" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-sidebar-border bg-sidebar/90 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 pb-4 pt-2">
            {navItems.map(renderNavlinks)}
          </nav>
        </div>
      )}
    </header>
  );
}
