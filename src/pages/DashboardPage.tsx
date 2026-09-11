import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Upload, FileText, Trash2, MoreVertical, Clock, Eye, Download } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter, Badge } from '@/components/ui'
import { useAppStore } from '@/store'

export default function DashboardPage() {
  const { user, projects, setCurrentProject, deleteProject, logout } = useAppStore()
  const navigate = useNavigate()
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  
  const handleNewProject = () => {
    navigate('/upload')
  }
  
  const handleOpenProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setCurrentProject(project)
      navigate('/analyze')
    }
  }
  
  const handleDeleteProject = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      deleteProject(projectId)
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <Link to="/dashboard" className="text-xl font-semibold text-text">AI Book Formatter</Link>
            </div>
            
            <nav className="flex items-center gap-4">
              <Link to="/dashboard" className="text-sm font-medium text-primary">Dashboard</Link>
              <span className="text-sm text-text-muted">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
            </nav>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text">Your Books</h1>
            <p className="text-text-muted mt-1">
              {projects.length === 0 
                ? 'Get started by uploading your first manuscript' 
                : `${projects.length} project${projects.length !== 1 ? 's' : ''} • Last updated ${new Date().toLocaleDateString()}`}
            </p>
          </div>
          <Button onClick={handleNewProject} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Book
          </Button>
        </div>
        
        {/* Projects Grid */}
        {projects.length === 0 ? (
          // Empty State
          <Card className="text-center py-16">
            <CardContent className="pt-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">No books yet</CardTitle>
              <CardDescription className="mt-2 max-w-md mx-auto">
                Upload your first manuscript and turn it into a professionally formatted book.
              </CardDescription>
              <Button onClick={handleNewProject} className="mt-6">
                <Plus className="h-4 w-4" />
                + New Book
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="group relative overflow-hidden transition-all hover:shadow-xl"
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
                onClick={() => handleOpenProject(project.id)}
              >
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                      <p className="text-sm text-text-muted mt-1">by {project.author}</p>
                    </div>
                    {hoveredProject === project.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={(e) => handleOpenProject(project.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={(e) => handleDeleteProject(e, project.id)}>
                          <Trash2 className="h-4 w-4 text-accent" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-4">{project.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                    <Badge variant="info">v{project.currentVersionId ? '1' : '0'}</Badge>
                  </div>
                </CardContent>
                
                <CardFooter className="px-6 pb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => { e.stopPropagation(); handleOpenProject(project.id) }}
                  >
                    Continue Formatting
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}