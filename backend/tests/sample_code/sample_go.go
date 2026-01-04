// Sample Go HTTP Handler for Manual Testing
// Expected noise: imports, error handling (if err != nil), logging, defer
// Expected clear: core HTTP routing logic, business logic

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// User represents a user in the system
type User struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// UserStore manages user data
type UserStore struct {
	users map[int]User
	mu    sync.RWMutex
}

// NewUserStore creates a new user store
func NewUserStore() *UserStore {
	return &UserStore{
		users: make(map[int]User),
	}
}

// GetUser retrieves a user by ID
func (s *UserStore) GetUser(id int) (*User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[id]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}

	return &user, nil
}

// CreateUser adds a new user
func (s *UserStore) CreateUser(name, email string) (*User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if name == "" || email == "" {
		return nil, fmt.Errorf("name and email are required")
	}

	newID := len(s.users) + 1
	user := User{
		ID:        newID,
		Name:      name,
		Email:     email,
		CreatedAt: time.Now(),
	}

	s.users[newID] = user
	return &user, nil
}

// Handlers
type UserHandler struct {
	store *UserStore
}

func NewUserHandler(store *UserStore) *UserHandler {
	return &UserHandler{store: store}
}

func (h *UserHandler) GetUserHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("GET /users handler called")

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		log.Printf("Error: missing user ID parameter")
		http.Error(w, "Missing user ID", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr)
	if err != nil {
		log.Printf("Error: invalid user ID format: %v", err)
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := h.store.GetUser(id)
	if err != nil {
		log.Printf("Error fetching user %d: %v", id, err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(user); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	log.Printf("Successfully returned user %d", id)
}

func (h *UserHandler) CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("POST /users handler called")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if req.Name == "" || req.Email == "" {
		log.Printf("Error: missing required fields")
		http.Error(w, "Name and email are required", http.StatusBadRequest)
		return
	}

	user, err := h.store.CreateUser(req.Name, req.Email)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(user); err != nil {
		log.Printf("Error encoding response: %v", err)
		return
	}

	log.Printf("Successfully created user %d", user.ID)
}

func main() {
	log.Println("Starting user service...")

	store := NewUserStore()
	handler := NewUserHandler(store)

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handler.GetUserHandler(w, r)
		case http.MethodPost:
			handler.CreateUserHandler(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	port := ":8080"
	log.Printf("Server listening on port %s", port)

	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
