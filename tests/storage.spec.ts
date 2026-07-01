/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  Thread,
  MemoryEntry,
  Skill,
  ScheduledTask,
  UserProfile,
} from "../src/lib/alice/types";
import { uid } from "../src/lib/alice/storage";

// Mock localStorage for Node environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

// Mock window
(global as any).window = { localStorage: localStorageMock };

describe("Storage utilities", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("uid()", () => {
    it("generates unique IDs", () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });

    it("generates valid UUID format", () => {
      const id = uid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe("Data structures", () => {
    it("Thread structure is valid", () => {
      const thread: Thread = {
        id: uid(),
        title: "Test",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      expect(thread.id).toBeDefined();
      expect(thread.title).toBe("Test");
    });

    it("MemoryEntry structure is valid", () => {
      const entry: MemoryEntry = {
        id: uid(),
        key: "test",
        value: "test value",
        createdAt: Date.now(),
      };
      expect(entry.key).toBe("test");
    });

    it("Skill structure is valid", () => {
      const skill: Skill = {
        id: uid(),
        name: "Test Skill",
        description: "Does something",
        trigger: "when needed",
        steps: "1. Do this\n2. Do that",
        createdAt: Date.now(),
      };
      expect(skill.name).toBe("Test Skill");
    });

    it("ScheduledTask structure is valid", () => {
      const task: ScheduledTask = {
        id: uid(),
        name: "Test Task",
        prompt: "Do something",
        schedule: "every 60m",
        intervalMs: 3600_000,
        nextRun: Date.now() + 3600_000,
        enabled: true,
      };
      expect(task.enabled).toBe(true);
    });

    it("UserProfile structure is valid", () => {
      const profile: UserProfile = {
        name: "Alice User",
        about: "Testing",
        preferences: "Concise responses",
        updatedAt: Date.now(),
      };
      expect(profile.name).toBe("Alice User");
    });
  });
});
