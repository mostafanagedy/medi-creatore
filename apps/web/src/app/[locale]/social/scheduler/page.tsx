'use client';

import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Video, Share2, Youtube, Facebook, Instagram, Twitter, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScheduledPost {
  id: string;
  title: string;
  platform: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter';
  date: Date;
  time: string;
  status: 'scheduled' | 'published' | 'failed';
  thumbnailUrl: string;
}

export default function SchedulerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mock data
  const [posts] = useState<ScheduledPost[]>([
    {
      id: '1',
      title: 'Top 5 AI Tools 2026',
      platform: 'youtube',
      date: new Date(),
      time: '18:00',
      status: 'scheduled',
      thumbnailUrl: 'https://picsum.photos/seed/ai1/400/225',
    },
    {
      id: '2',
      title: 'Behind the scenes at MediCreatore',
      platform: 'instagram',
      date: new Date(new Date().setDate(new Date().getDate() + 1)),
      time: '14:30',
      status: 'scheduled',
      thumbnailUrl: 'https://picsum.photos/seed/ai2/300/400',
    },
    {
      id: '3',
      title: 'How to automate your content',
      platform: 'tiktok',
      date: new Date(new Date().setDate(new Date().getDate() + 2)),
      time: '20:00',
      status: 'scheduled',
      thumbnailUrl: 'https://picsum.photos/seed/ai3/300/400',
    }
  ]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <Youtube className="w-4 h-4 text-[#FF0000]" />;
      case 'facebook': return <Facebook className="w-4 h-4 text-[#1877F2]" />;
      case 'instagram': return <Instagram className="w-4 h-4 text-[#E4405F]" />;
      case 'tiktok': return <Video className="w-4 h-4 text-white" />;
      case 'twitter': return <Twitter className="w-4 h-4 text-[#1DA1F2]" />;
      default: return <Share2 className="w-4 h-4" />;
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();

    // Empty cells before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 border border-white/5 bg-background/20 rounded-md"></div>);
    }

    // Actual days
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDayDate = new Date(year, month, i);
      const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      
      const dayPosts = posts.filter(p => 
        p.date.getDate() === i && 
        p.date.getMonth() === month && 
        p.date.getFullYear() === year
      );

      days.push(
        <div key={i} className={`h-32 p-2 border border-white/10 rounded-md transition-colors hover:bg-white/5 group ${isToday ? 'bg-primary/10 border-primary/30' : 'bg-background/40'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-gradient text-white shadow-lg' : 'text-muted-foreground group-hover:text-white'}`}>
              {i}
            </span>
            <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="space-y-1.5 overflow-y-auto max-h-[70px] scrollbar-none">
            {dayPosts.map(post => (
              <div key={post.id} className="flex items-center gap-1.5 p-1.5 rounded bg-background/80 border border-white/5 cursor-pointer hover:border-primary/50 transition-colors">
                {getPlatformIcon(post.platform)}
                <span className="text-[10px] font-medium truncate flex-1">{post.time}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="w-8 h-8 text-primary" />
            Content Scheduler
          </h1>
          <p className="text-muted-foreground mt-2">
            Plan, schedule, and automate your video publications across all platforms.
          </p>
        </div>
        <Button className="bg-brand-gradient border-0 text-white shadow-lg hover:opacity-90 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" /> Schedule Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-3 glass-card p-6 border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs">
                Today
              </Button>
              <div className="flex items-center border border-white/10 rounded-md overflow-hidden bg-background/50">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-white/10" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-2 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {renderCalendarDays()}
              </div>
            </div>
          </div>
        </Card>

        {/* Upcoming List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Upcoming Posts
          </h3>
          
          <div className="space-y-3">
            {posts.map(post => (
              <Card key={post.id} className="glass-card overflow-hidden border-white/10 group cursor-pointer hover:border-primary/30 transition-all">
                <div className="h-24 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm p-1 rounded-md shadow-lg">
                    {getPlatformIcon(post.platform)}
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-medium text-white flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {post.time}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm truncate" title={post.title}>{post.title}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {post.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      Scheduled
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-white border border-dashed border-white/10 h-24">
              <Plus className="w-4 h-4 mr-2" /> Add to Queue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
