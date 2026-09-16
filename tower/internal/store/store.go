// Package store persists subscriptions and parsed nodes as JSON files.
package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/kenzok8/tower/internal/model"
)

const stateFile = "tower.json"

// State is the full persisted snapshot.
type State struct {
	Subscriptions []model.SubscriptionSource `json:"subscriptions"`
	Nodes         []model.ProxyNode          `json:"nodes"`
}

// emptyState returns a State with non-nil slices so it serializes as [] rather
// than null.
func emptyState() *State {
	return &State{
		Subscriptions: []model.SubscriptionSource{},
		Nodes:         []model.ProxyNode{},
	}
}

// normalizeState ensures the slices are non-nil.
func normalizeState(state *State) *State {
	if state.Subscriptions == nil {
		state.Subscriptions = []model.SubscriptionSource{}
	}
	if state.Nodes == nil {
		state.Nodes = []model.ProxyNode{}
	}
	return state
}

// Store loads and atomically saves the state in a directory.
type Store struct {
	dir string
	mu  sync.RWMutex
}

// New creates a Store rooted at dir (created on first save).
func New(dir string) *Store {
	return &Store{dir: dir}
}

// Dir returns the storage directory.
func (s *Store) Dir() string { return s.dir }

func (s *Store) path() string { return filepath.Join(s.dir, stateFile) }

// Load reads the persisted state, returning an empty state when the file is
// missing.
func (s *Store) Load() (*State, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	b, err := os.ReadFile(s.path())
	if err != nil {
		if os.IsNotExist(err) {
			return emptyState(), nil
		}
		return nil, err
	}
	var state State
	if err := json.Unmarshal(b, &state); err != nil {
		return nil, err
	}
	return normalizeState(&state), nil
}

// Save writes the state atomically (temp file + rename).
func (s *Store) Save(state *State) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.saveLocked(state)
}

// Update runs fn against a mutable copy and persists the result. fn receives
// the current state and returns the new state.
func (s *Store) Update(fn func(*State) error) (*State, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, err := s.loadLocked()
	if err != nil {
		return nil, err
	}
	if err := fn(state); err != nil {
		return nil, err
	}
	if err := s.saveLocked(state); err != nil {
		return nil, err
	}
	return state, nil
}

func (s *Store) loadLocked() (*State, error) {
	b, err := os.ReadFile(s.path())
	if err != nil {
		if os.IsNotExist(err) {
			return emptyState(), nil
		}
		return nil, err
	}
	var state State
	if err := json.Unmarshal(b, &state); err != nil {
		return nil, err
	}
	return normalizeState(&state), nil
}

func (s *Store) saveLocked(state *State) error {
	if err := os.MkdirAll(s.dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path() + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path())
}
