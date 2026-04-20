package attachmentsvc

import (
	"context"
	"errors"

	"github.com/google/uuid"
	attachmentdom "github.com/paca/api/internal/domain/attachment"
	taskdom "github.com/paca/api/internal/domain/task"
)

type taskOwnerChecker struct {
	repo taskdom.TaskRepository
}

func NewTaskOwnerChecker(repo taskdom.TaskRepository) attachmentdom.TaskOwnerChecker {
	return &taskOwnerChecker{repo: repo}
}

func (c *taskOwnerChecker) TaskBelongsToProject(ctx context.Context, projectID, taskID uuid.UUID) error {
	t, err := c.repo.FindTaskByID(ctx, taskID)
	if err != nil {
		if errors.Is(err, taskdom.ErrTaskNotFound) {
			return attachmentdom.ErrTaskNotInProject
		}
		return err
	}
	if t.ProjectID != projectID {
		return attachmentdom.ErrTaskNotInProject
	}
	return nil
}
