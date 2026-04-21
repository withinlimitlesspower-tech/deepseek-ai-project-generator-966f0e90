import { ProjectBlueprint, ComponentNode, FileStructure, BlueprintSection } from '../types/project.types';
import { AIResponse } from '../types/ai.types';

/**
 * BlueprintRenderer - Utility for rendering project blueprints in a structured format
 * Supports both console output and formatted string generation
 */
export class BlueprintRenderer {
  private static readonly SECTION_PADDING = 2;
  private static readonly INDENT_SIZE = 2;
  private static readonly MAX_WIDTH = 80;
  
  /**
   * Render a complete project blueprint
   */
  public static renderBlueprint(blueprint: ProjectBlueprint): string {
    const sections: string[] = [];
    
    // Project header
    sections.push(this.renderHeader(blueprint));
    
    // Project overview
    sections.push(this.renderOverview(blueprint));
    
    // File structure
    if (blueprint.fileStructure) {
      sections.push(this.renderFileStructure(blueprint.fileStructure));
    }
    
    // Components
    if (blueprint.components && blueprint.components.length > 0) {
      sections.push(this.renderComponents(blueprint.components));
    }
    
    // Dependencies
    if (blueprint.dependencies && blueprint.dependencies.length > 0) {
      sections.push(this.renderDependencies(blueprint.dependencies));
    }
    
    // Implementation steps
    if (blueprint.implementationSteps && blueprint.implementationSteps.length > 0) {
      sections.push(this.renderImplementationSteps(blueprint.implementationSteps));
    }
    
    return sections.join('\n\n');
  }
  
  /**
   * Render blueprint as part of an AI response
   */
  public static renderForAIResponse(blueprint: ProjectBlueprint): AIResponse {
    const content = this.renderBlueprint(blueprint);
    
    return {
      id: `blueprint-${Date.now()}`,
      content,
      type: 'blueprint',
      timestamp: new Date().toISOString(),
      metadata: {
        projectName: blueprint.projectName,
        projectType: blueprint.projectType,
        sections: Object.keys(blueprint).filter(key => 
          blueprint[key as keyof ProjectBlueprint] !== undefined
        )
      }
    };
  }
  
  /**
   * Render project header section
   */
  private static renderHeader(blueprint: ProjectBlueprint): string {
    const title = `🚀 ${blueprint.projectName.toUpperCase()}`;
    const separator = '═'.repeat(this.MAX_WIDTH);
    const typeLine = `📁 Project Type: ${blueprint.projectType}`;
    const description = blueprint.description 
      ? this.wrapText(`📝 ${blueprint.description}`, this.MAX_WIDTH - 4)
      : '';
    
    return [
      separator,
      this.centerText(title, this.MAX_WIDTH),
      separator,
      typeLine,
      description
    ].filter(Boolean).join('\n');
  }
  
  /**
   * Render project overview section
   */
  private static renderOverview(blueprint: ProjectBlueprint): string {
    const sections: string[] = [];
    
    sections.push(this.createSectionTitle('📋 PROJECT OVERVIEW'));
    
    if (blueprint.technologies && blueprint.technologies.length > 0) {
      sections.push(`🛠️  Technologies: ${blueprint.technologies.join(', ')}`);
    }
    
    if (blueprint.architecture) {
      sections.push(`🏗️  Architecture: ${blueprint.architecture}`);
    }
    
    if (blueprint.scope) {
      sections.push(`🎯 Scope: ${blueprint.scope}`);
    }
    
    if (blueprint.objectives && blueprint.objectives.length > 0) {
      sections.push('🎯 Objectives:');
      blueprint.objectives.forEach((objective, index) => {
        sections.push(`  ${index + 1}. ${objective}`);
      });
    }
    
    return sections.join('\n');
  }
  
  /**
   * Render file structure section
   */
  private static renderFileStructure(structure: FileStructure): string {
    const sections: string[] = [];
    
    sections.push(this.createSectionTitle('📁 FILE STRUCTURE'));
    sections.push(this.renderFileTree(structure.root, 0));
    
    return sections.join('\n');
  }
  
  /**
   * Recursively render file tree
   */
  private static renderFileTree(node: FileStructure, depth: number): string {
    const indent = ' '.repeat(depth * this.INDENT_SIZE);
    const lines: string[] = [];
    
    // Render current node
    const icon = node.type === 'directory' ? '📁' : '📄';
    lines.push(`${indent}${icon} ${node.name}`);
    
    // Render children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        lines.push(this.renderFileTree(child, depth + 1));
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * Render components section
   */
  private static renderComponents(components: ComponentNode[]): string {
    const sections: string[] = [];
    
    sections.push(this.createSectionTitle('🧩 COMPONENTS'));
    
    components.forEach((component, index) => {
      sections.push(`\n${index + 1}. ${component.name}`);
      sections.push(`   Type: ${component.type}`);
      
      if (component.description) {
        sections.push(`   Description: ${component.description}`);
      }
      
      if (component.responsibilities && component.responsibilities.length > 0) {
        sections.push(`   Responsibilities:`);
        component.responsibilities.forEach(resp => {
          sections.push(`     • ${resp}`);
        });
      }
      
      if (component.dependencies && component.dependencies.length > 0) {
        sections.push(`   Dependencies: ${component.dependencies.join(', ')}`);
      }
    });
    
    return sections.join('\n');
  }
  
  /**
   * Render dependencies section
   */
  private static renderDependencies(dependencies: string[]): string {
    const sections: string[] = [];
    
    sections.push(this.createSectionTitle('📦 DEPENDENCIES'));
    
    // Group dependencies by type
    const prodDeps = dependencies.filter(dep => !dep.includes('@types/') && !dep.includes('-dev'));
    const devDeps = dependencies.filter(dep => dep.includes('@types/') || dep.includes('-dev'));
    const typeDeps = dependencies.filter(dep => dep.includes('@types/'));
    
    if (prodDeps.length > 0) {
      sections.push('\nProduction Dependencies:');
      prodDeps.forEach(dep => {
        sections.push(`  • ${dep}`);
      });
    }
    
    if (devDeps.length > 0) {
      sections.push('\nDevelopment Dependencies:');
      devDeps.forEach(dep => {
        sections.push(`  • ${dep}`);
      });
    }
    
    if (typeDeps.length > 0) {
      sections.push('\nType Definitions:');
      typeDeps.forEach(dep => {
        sections.push(`  • ${dep}`);
      });
    }
    
    return sections.join('\n');
  }
  
  /**
   * Render implementation steps section
   */
  private static renderImplementationSteps(steps: string[]): string {
    const sections: string[] = [];
    
    sections.push(this.createSectionTitle('🔧 IMPLEMENTATION STEPS'));
    
    steps.forEach((step, index) => {
      sections.push(`${index + 1}. ${step}`);
    });
    
    return sections.join('\n');
  }
  
  /**
   * Create a formatted section title
   */
  private static createSectionTitle(title: string): string {
    const padding = ' '.repeat(this.SECTION_PADDING);
    return `\n${padding}${title}\n${padding}${'─'.repeat(title.length)}`;
  }
  
  /**
   * Center text within a given width
   */
  private static centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
  
  /**
   * Wrap text to specified width
   */
  private static wrapText(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }
  
  /**
   * Validate blueprint structure
   */
  public static validateBlueprint(blueprint: ProjectBlueprint): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!blueprint.projectName || blueprint.projectName.trim() === '') {
      errors.push('Project name is required');
    }
    
    if (!blueprint.projectType || blueprint.projectType.trim() === '') {
      errors.push('Project type is required');
    }
    
    if (!blueprint.description || blueprint.description.trim() === '') {
      errors.push('Project description is required');
    }
    
    if (!blueprint