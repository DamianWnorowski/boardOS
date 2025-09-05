import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Plus, Edit, Trash2, CheckCircle, AlertTriangle, 
  Settings, Target, Magnet, Eye, EyeOff, Download, Upload
} from 'lucide-react';
import { useScheduler } from '../../context/SchedulerContext';
import { MagnetInteractionRule, DropRule, ResourceType, RowType } from '../../types';
import { SmartRuleGenerator, GeneratedRule } from '../../utils/smartRuleGenerator';

interface UnifiedRulesTableProps {
  onAddRule?: () => void;
  onEditRule?: (rule: any) => void;
  onDeleteRule?: (ruleId: string) => void;
}

type RuleType = 'all' | 'magnet' | 'drop' | 'job';
type RuleCategory = 'all' | 'safety' | 'business' | 'efficiency';

interface UnifiedRule {
  id: string;
  type: RuleType;
  category: RuleCategory;
  source: ResourceType | RowType;
  target: ResourceType | RowType;
  description: string;
  isRequired?: boolean;
  maxCount?: number;
  canAttach?: boolean;
  enabled: boolean;
  confidence?: number;
  reasoning?: string;
  originalRule: MagnetInteractionRule | DropRule | any;
}

const UnifiedRulesTable: React.FC<UnifiedRulesTableProps> = ({
  onAddRule,
  onEditRule,
  onDeleteRule
}) => {
  const { 
    magnetInteractionRules, 
    dropRules,
    updateMagnetInteractionRule,
    updateDropRule,
    resources
  } = useScheduler();

  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<RuleType>('all');
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory>('all');
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());

  // Convert all rules to unified format
  const unifiedRules = useMemo(() => {
    const rules: UnifiedRule[] = [];

    // Convert magnet interaction rules
    magnetInteractionRules.forEach(rule => {
      rules.push({
        id: `magnet_${rule.sourceType}_${rule.targetType}`,
        type: 'magnet',
        category: rule.isRequired ? 'safety' : 'business',
        source: rule.sourceType,
        target: rule.targetType,
        description: `${rule.sourceType} ${rule.canAttach ? 'can attach to' : 'cannot attach to'} ${rule.targetType}`,
        isRequired: rule.isRequired,
        maxCount: rule.maxCount,
        canAttach: rule.canAttach,
        enabled: rule.canAttach,
        originalRule: rule
      });
    });

    // Convert drop rules
    dropRules.forEach(rule => {
      rule.allowedTypes.forEach(allowedType => {
        rules.push({
          id: `drop_${rule.rowType}_${allowedType}`,
          type: 'drop',
          category: 'business',
          source: allowedType,
          target: rule.rowType,
          description: `${allowedType} can be placed in ${rule.rowType} row`,
          enabled: true,
          originalRule: rule
        });
      });
    });

    return rules;
  }, [magnetInteractionRules, dropRules]);

  // Generate suggested rules
  const suggestedRules = useMemo(() => {
    if (!showSuggestions) return [];

    const analysis = SmartRuleGenerator.analyzeExistingRules(magnetInteractionRules, dropRules);
    const standardRules = SmartRuleGenerator.generateStandardConstructionRules();
    
    // Filter out rules that already exist
    return standardRules.filter(suggested => {
      return !unifiedRules.some(existing => {
        if (suggested.type === 'magnet_interaction' && existing.type === 'magnet') {
          return existing.source === suggested.rule.sourceType && 
                 existing.target === suggested.rule.targetType;
        }
        return false;
      });
    });
  }, [magnetInteractionRules, dropRules, unifiedRules, showSuggestions]);

  // Filter rules based on search and filters
  const filteredRules = useMemo(() => {
    let filtered = unifiedRules;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.target.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(rule => rule.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(rule => rule.category === categoryFilter);
    }

    return filtered;
  }, [unifiedRules, searchTerm, typeFilter, categoryFilter]);

  const getTypeIcon = (type: RuleType) => {
    switch (type) {
      case 'magnet': return <Magnet size={14} className="text-blue-600" />;
      case 'drop': return <Target size={14} className="text-green-600" />;
      case 'job': return <Settings size={14} className="text-purple-600" />;
      default: return null;
    }
  };

  const getCategoryColor = (category: RuleCategory) => {
    switch (category) {
      case 'safety': return 'text-red-600 bg-red-50';
      case 'business': return 'text-blue-600 bg-blue-50';
      case 'efficiency': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleRuleToggle = (rule: UnifiedRule) => {
    if (rule.type === 'magnet') {
      const magnetRule = rule.originalRule as MagnetInteractionRule;
      updateMagnetInteractionRule({
        ...magnetRule,
        canAttach: !rule.enabled
      });
    }
    // Note: Drop rules don't have enable/disable - they exist or don't
  };

  const handleBulkAction = (action: 'enable' | 'disable' | 'delete') => {
    selectedRules.forEach(ruleId => {
      const rule = unifiedRules.find(r => r.id === ruleId);
      if (rule && action === 'delete') {
        onDeleteRule?.(ruleId);
      } else if (rule && (action === 'enable' || action === 'disable')) {
        // Handle bulk enable/disable
        if (rule.type === 'magnet') {
          const magnetRule = rule.originalRule as MagnetInteractionRule;
          updateMagnetInteractionRule({
            ...magnetRule,
            canAttach: action === 'enable'
          });
        }
      }
    });
    setSelectedRules(new Set());
  };

  const handleSelectRule = (ruleId: string) => {
    const newSelected = new Set(selectedRules);
    if (newSelected.has(ruleId)) {
      newSelected.delete(ruleId);
    } else {
      newSelected.add(ruleId);
    }
    setSelectedRules(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRules.size === filteredRules.length) {
      setSelectedRules(new Set());
    } else {
      setSelectedRules(new Set(filteredRules.map(r => r.id)));
    }
  };

  const applySuggestedRule = (suggestedRule: GeneratedRule) => {
    if (suggestedRule.type === 'magnet_interaction') {
      updateMagnetInteractionRule(suggestedRule.rule as MagnetInteractionRule);
    }
    // Add logic for other rule types as needed
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Unified Rules Management</h3>
            <p className="text-sm text-gray-600">
              Manage all magnet interaction rules, drop rules, and job configurations in one place
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Settings size={16} className="mr-1" />
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </button>
            {onAddRule && (
              <button
                onClick={onAddRule}
                className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Rule
              </button>
            )}
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as RuleType)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="magnet">Magnet Rules</option>
            <option value="drop">Drop Rules</option>
            <option value="job">Job Rules</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as RuleCategory)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="safety">Safety</option>
            <option value="business">Business</option>
            <option value="efficiency">Efficiency</option>
          </select>

          <button
            onClick={() => setShowOnlyConflicts(!showOnlyConflicts)}
            className={`flex items-center px-3 py-2 rounded-md text-sm ${
              showOnlyConflicts ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <AlertTriangle size={16} className="mr-1" />
            Conflicts
          </button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedRules.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedRules.size} rule{selectedRules.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('enable')}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
              >
                Enable
              </button>
              <button
                onClick={() => handleBulkAction('disable')}
                className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
              >
                Disable
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions panel */}
      {showSuggestions && suggestedRules.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Suggested Rules</h4>
          <div className="space-y-2">
            {suggestedRules.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-blue-300">
                <div className="flex-1">
                  <div className="text-sm font-medium">{suggestion.description}</div>
                  <div className="text-xs text-gray-600">{suggestion.reasoning}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${getCategoryColor(suggestion.category)}`}>
                      {suggestion.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      Confidence: {Math.round((suggestion.confidence || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => applySuggestedRule(suggestion)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="w-8 p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedRules.size === filteredRules.length && filteredRules.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedRules.has(rule.id)}
                    onChange={() => handleSelectRule(rule.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(rule.type)}
                    <span className="text-sm font-medium capitalize">{rule.type}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-gray-900">{rule.source}</td>
                <td className="p-3 text-sm text-gray-900">{rule.target}</td>
                <td className="p-3 text-sm text-gray-900">{rule.description}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(rule.category)}`}>
                    {rule.category}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRuleToggle(rule)}
                      className={`p-1 rounded ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {rule.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    {rule.isRequired && (
                      <span className="px-1 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                        Required
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    {onEditRule && (
                      <button
                        onClick={() => onEditRule(rule)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {onDeleteRule && (
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Settings size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No rules found</p>
            <p className="text-sm">Try adjusting your search criteria or add some rules</p>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between text-sm text-gray-600">
          <div>
            Showing {filteredRules.length} of {unifiedRules.length} rules
          </div>
          <div className="flex space-x-4">
            <span>Magnet: {unifiedRules.filter(r => r.type === 'magnet').length}</span>
            <span>Drop: {unifiedRules.filter(r => r.type === 'drop').length}</span>
            <span>Active: {unifiedRules.filter(r => r.enabled).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedRulesTable;