"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TimePicker({
  onChange,
  value,
}: {
  onChange?: (time: Date) => void;
  value?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(value ?? new Date());

  useEffect(() => {
    if (value) {
      setDate(value);
    }
  }, [value]);

  return (
    <div className="flex gap-4 self-start">
      <div className="flex flex-col gap-3">
        <Label
          htmlFor="date-picker"
          className="text-foreground font-semibold uppercase text-xs tracking-wider"
        >
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="justify-between h-11"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden bg-black p-0"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              startMonth={new Date(new Date().getFullYear(), new Date().getMonth())}
              endMonth={new Date(new Date().getFullYear() + 1, 11)}
              showOutsideDays
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              onSelect={(date) => {
                if (date) {
                  setDate(date);
                  onChange?.(date);
                }
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label
          htmlFor="time-picker"
          className="text-foreground font-semibold uppercase text-xs tracking-wider"
        >
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          step="60"
          value={date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          onChange={(e) => {
            const [hours, minutes] = e.target.value.split(":").map(Number);
            const newDate = new Date(date);
            newDate.setHours(hours, minutes);
            if (Number.isNaN(newDate.getTime())) return;
            setDate(newDate);
            onChange?.(newDate);
          }}
          className="bg-background h-11 focus:border-yellow-400 focus-visible:shadow-none  appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}
