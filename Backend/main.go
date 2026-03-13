package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"
)

// --- DATA STRUCTURES ---

type Message struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type Session struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Timestamp string    `json:"timestamp"`
	Status    string    `json:"status"`
	Messages  []Message `json:"messages"`
}

type AppRequest struct {
	SessionID string `json:"sessionId"`
	Prompt    string `json:"prompt"`
}

type AppResponse struct {
	Reply string `json:"reply"`
}

// Ollama Chat API Structures (Upgraded for Conversational Memory!)
type OllamaMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OllamaChatRequest struct {
	Model    string          `json:"model"`
	Messages []OllamaMessage `json:"messages"`
	Stream   bool            `json:"stream"`
}

type OllamaChatResponse struct {
	Message OllamaMessage `json:"message"`
}

// --- FILE HANDLING LOGIC ---

const historyFile = "history.json"

var fileMutex sync.Mutex // Prevents file corruption if multiple requests hit at once

func loadHistory() []Session {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	file, err := os.ReadFile(historyFile)
	if err != nil {
		return []Session{}
	}
	var sessions []Session
	json.Unmarshal(file, &sessions)
	return sessions
}

func saveHistory(sessions []Session) {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	data, _ := json.MarshalIndent(sessions, "", "  ")
	os.WriteFile(historyFile, data, 0644)
}

// --- ENDPOINTS ---

func debugHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		return
	}

	var appReq AppRequest
	if err := json.NewDecoder(r.Body).Decode(&appReq); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	// 1. Load history to find past context for this session
	sessions := loadHistory()
	var currentSessionIndex = -1
	var ollamaMessages []OllamaMessage

	// Always start with the system prompt so Qwen knows its job
	ollamaMessages = append(ollamaMessages, OllamaMessage{
		Role:    "system",
		Content: "You are Trace, an expert AI debugger. Provide concise, accurate code fixes.",
	})

	for i, s := range sessions {
		if s.ID == appReq.SessionID {
			currentSessionIndex = i
			// Load all past messages into Ollama's memory!
			for _, msg := range s.Messages {
				ollamaRole := "user"
				if msg.Role == "ai" {
					ollamaRole = "assistant"
				}
				ollamaMessages = append(ollamaMessages, OllamaMessage{
					Role:    ollamaRole,
					Content: msg.Text,
				})
			}
			break
		}
	}

	// Append the brand new user prompt
	ollamaMessages = append(ollamaMessages, OllamaMessage{
		Role:    "user",
		Content: appReq.Prompt,
	})

	// 2. Query Ollama's Chat API
	ollamaReq := OllamaChatRequest{
		Model:    "qwen2.5-coder:1.5b",
		Messages: ollamaMessages,
		Stream:   false,
	}
	reqBytes, _ := json.Marshal(ollamaReq)

	// NOTE: Upgraded to /api/chat instead of /api/generate
	resp, err := http.Post("http://localhost:11434/api/chat", "application/json", bytes.NewBuffer(reqBytes))
	if err != nil {
		http.Error(w, "Failed to connect to Ollama", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var ollamaResp OllamaChatResponse
	json.NewDecoder(resp.Body).Decode(&ollamaResp)

	// 3. Save the updated conversation to history.json
	newAiText := ollamaResp.Message.Content

	if currentSessionIndex != -1 {
		// Append to existing session
		sessions[currentSessionIndex].Messages = append(sessions[currentSessionIndex].Messages, Message{Role: "user", Text: appReq.Prompt})
		sessions[currentSessionIndex].Messages = append(sessions[currentSessionIndex].Messages, Message{Role: "ai", Text: newAiText})
	} else {
		// Create a brand new session
		newSession := Session{
			ID:        appReq.SessionID,
			Title:     appReq.Prompt, // First prompt becomes the title
			Timestamp: time.Now().Format("Jan 02, 3:04 PM"),
			Status:    "error",
			Messages: []Message{
				{Role: "user", Text: appReq.Prompt},
				{Role: "ai", Text: newAiText},
			},
		}
		sessions = append([]Session{newSession}, sessions...)
	}

	saveHistory(sessions)

	// 4. Send response back to the React Native app
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AppResponse{Reply: newAiText})
}

func getHistoryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	sessions := loadHistory()
	json.NewEncoder(w).Encode(map[string]interface{}{
		"sessions": sessions,
	})
}

func main() {
	http.HandleFunc("/api/debug", debugHandler)
	http.HandleFunc("/api/history", getHistoryHandler)

	fmt.Println("Trace Backend is listening on port 8080...")
	fmt.Println("Ollama Chat Memory is ACTIVE.")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("Server error:", err)
	}
}
