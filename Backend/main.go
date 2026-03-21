package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
)

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Message struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type Session struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Title     string    `json:"title"`
	Timestamp string    `json:"timestamp"`
	Status    string    `json:"status"`
	Messages  []Message `json:"messages"`
}

type AppRequest struct {
	SessionID string `json:"sessionId"`
	Username  string `json:"username"`
	Prompt    string `json:"prompt"`
}

type DeleteRequest struct {
	SessionID string `json:"sessionId"`
	Username  string `json:"username"`
}

type AppResponse struct {
	Reply string `json:"reply"`
}

type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqRequest struct {
	Model    string        `json:"model"`
	Messages []GroqMessage `json:"messages"`
}

type GroqResponse struct {
	Choices []struct {
		Message GroqMessage `json:"message"`
	} `json:"choices"`
}

var db *sql.DB

func initDB() {
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		panic("DATABASE_URL environment variable not set")
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}

	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(30 * time.Minute)

	if err = db.Ping(); err != nil {
		panic("Database is unreachable: " + err.Error())
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT NOT NULL);`)
	if err != nil {
		panic("Failed to create users table: " + err.Error())
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, username TEXT NOT NULL, title TEXT, timestamp TEXT, status TEXT, messages JSONB DEFAULT '[]');`)
	if err != nil {
		panic("Failed to create sessions table: " + err.Error())
	}

	fmt.Println("✅ Database connected and tables ready.")
}

func callGroq(messages []GroqMessage) (string, error) {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY environment variable not set")
	}

	groqReq := GroqRequest{Model: "llama-3.3-70b-versatile", Messages: messages}
	reqBytes, _ := json.Marshal(groqReq)

	req, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(reqBytes))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var groqResp GroqResponse
	if err := json.Unmarshal(body, &groqResp); err != nil {
		return "", err
	}

	if len(groqResp.Choices) == 0 {
		return "", fmt.Errorf("no response from Groq: %s", string(body))
	}

	return groqResp.Choices[0].Message.Content, nil
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	_, err := db.Exec("INSERT INTO users (username, password) VALUES ($1, $2)", req.Username, req.Password)
	if err != nil {
		http.Error(w, "User already exists", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "User registered successfully"})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "Username and password are required", http.StatusBadRequest)
		return
	}

	var storedPassword string
	err := db.QueryRow("SELECT password FROM users WHERE username = $1", req.Username).Scan(&storedPassword)
	if err != nil || storedPassword != req.Password {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
}

func debugHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	var appReq AppRequest
	if err := json.NewDecoder(r.Body).Decode(&appReq); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if appReq.Prompt == "" || appReq.Username == "" {
		http.Error(w, "Username and prompt are required", http.StatusBadRequest)
		return
	}

	var messagesJSON []byte
	var groqMessages []GroqMessage

	groqMessages = append(groqMessages, GroqMessage{
		Role:    "system",
		Content: "You are Trace, an expert AI debugger. Provide concise, accurate code fixes.",
	})

	err := db.QueryRow(
		"SELECT messages FROM sessions WHERE id = $1 AND username = $2",
		appReq.SessionID, appReq.Username,
	).Scan(&messagesJSON)

	sessionExists := err == nil

	if sessionExists {
		var pastMessages []Message
		json.Unmarshal(messagesJSON, &pastMessages)
		for _, msg := range pastMessages {
			role := "user"
			if msg.Role == "ai" {
				role = "assistant"
			}
			groqMessages = append(groqMessages, GroqMessage{Role: role, Content: msg.Text})
		}
	}

	groqMessages = append(groqMessages, GroqMessage{Role: "user", Content: appReq.Prompt})

	aiReply, err := callGroq(groqMessages)
	if err != nil {
		http.Error(w, "Failed to get AI response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if sessionExists {
		var existingMessages []Message
		json.Unmarshal(messagesJSON, &existingMessages)
		existingMessages = append(existingMessages,
			Message{Role: "user", Text: appReq.Prompt},
			Message{Role: "ai", Text: aiReply},
		)
		updatedJSON, _ := json.Marshal(existingMessages)
		db.Exec("UPDATE sessions SET messages = $1 WHERE id = $2 AND username = $3", updatedJSON, appReq.SessionID, appReq.Username)
	} else {
		newMessages := []Message{
			{Role: "user", Text: appReq.Prompt},
			{Role: "ai", Text: aiReply},
		}
		newMessagesJSON, _ := json.Marshal(newMessages)
		db.Exec(
			"INSERT INTO sessions (id, username, title, timestamp, status, messages) VALUES ($1, $2, $3, $4, $5, $6)",
			appReq.SessionID, appReq.Username, appReq.Prompt,
			time.Now().Format("2006-01-02 15:04:05"),
			"error", newMessagesJSON,
		)
	}

	json.NewEncoder(w).Encode(AppResponse{Reply: aiReply})
}

func getHistoryHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	username := r.URL.Query().Get("username")
	if username == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"sessions": []Session{}})
		return
	}

	rows, err := db.Query(
		"SELECT id, username, title, timestamp, status, messages FROM sessions WHERE username = $1 ORDER BY timestamp DESC",
		username,
	)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"sessions": []Session{}})
		return
	}
	defer rows.Close()

	var sessions []Session
	for rows.Next() {
		var s Session
		var messagesJSON []byte
		rows.Scan(&s.ID, &s.Username, &s.Title, &s.Timestamp, &s.Status, &messagesJSON)
		json.Unmarshal(messagesJSON, &s.Messages)
		sessions = append(sessions, s)
	}

	if sessions == nil {
		sessions = []Session{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"sessions": sessions})
}

func deleteHistoryHandler(w http.ResponseWriter, r *http.Request) {
	setCORS(w)
	if r.Method == "OPTIONS" {
		return
	}

	var req DeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	db.Exec("DELETE FROM sessions WHERE id = $1 AND username = $2", req.SessionID, req.Username)
	json.NewEncoder(w).Encode(map[string]string{"message": "Deleted successfully"})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func main() {
	initDB()

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/register", registerHandler)
	http.HandleFunc("/api/login", loginHandler)
	http.HandleFunc("/api/debug", debugHandler)
	http.HandleFunc("/api/history", getHistoryHandler)
	http.HandleFunc("/api/delete", deleteHistoryHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("🚀 Trace Backend running on port " + port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Println("Server error:", err)
	}
}
