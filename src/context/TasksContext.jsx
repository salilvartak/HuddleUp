import React, { createContext, useContext } from 'react';
import { useAppContext } from './AppContext';
import { useTasks } from '../hooks/useTasks';

const TasksContext = createContext(null);

export const TasksProvider = ({ children }) => {
  const { selectedProjectId } = useAppContext();
  const tasksData = useTasks(selectedProjectId);

  return (
    <TasksContext.Provider value={tasksData}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasksContext = () => {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasksContext must be used within TasksProvider');
  return ctx;
};
