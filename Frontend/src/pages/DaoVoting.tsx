import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { daoAPI, portfolioAPI, DaoProposal, DaoProposalResult } from '@/lib/api';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Vote, Plus, TrendingUp, CheckCircle2, XCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

export function DaoVoting() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<DaoProposal[]>([]);
  const [userProperties, setUserProperties] = useState<Array<{ property_id: number; property_name: string; tokens: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isVoteDialogOpen, setIsVoteDialogOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<DaoProposal | null>(null);
  const [proposalResults, setProposalResults] = useState<Record<number, DaoProposalResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating proposal
  const [formData, setFormData] = useState({
    property_id: '',
    title: '',
    description: '',
    proposal_type: 'general',
    options: ['Yes', 'No', 'Abstain'],
    min_quorum_percent: 10,
  });

  // For custom options
  const [customOptions, setCustomOptions] = useState<string[]>(['']);
  const [useCustomOptions, setUseCustomOptions] = useState(false);

  // Vote selection
  const [selectedOption, setSelectedOption] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get user's portfolio to see which properties they own tokens in
      const portfolio = await portfolioAPI.getSummary(user.id);
      const properties = portfolio.balances.map(b => ({
        property_id: b.property_id,
        property_name: b.property_name,
        tokens: b.tokens,
      }));
      setUserProperties(properties);

      // Load proposals ONLY for properties where user owns tokens
      const allProposals: DaoProposal[] = [];
      for (const prop of properties) {
        const propProposals = await daoAPI.getPropertyProposals(prop.property_id);
        allProposals.push(...propProposals);
      }
      
      setProposals(allProposals);

      // Load results for all proposals
      const results: Record<number, DaoProposalResult> = {};
      for (const proposal of allProposals) {
        try {
          const result = await daoAPI.getProposalResults(proposal.id);
          results[proposal.id] = result;
        } catch (error) {
          console.error(`Failed to load results for proposal ${proposal.id}:`, error);
        }
      }
      setProposalResults(results);
    } catch (error) {
      console.error('Failed to load DAO data:', error);
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!user) return;

    if (!formData.property_id || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Determine which options to use
    const finalOptions = useCustomOptions 
      ? customOptions.filter(opt => opt.trim() !== '')
      : formData.options;

    if (finalOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    // Validate rent decision options are numbers
    if (formData.proposal_type === 'rent_decision') {
      const allNumbers = finalOptions.every(opt => !isNaN(Number(opt)) && opt.trim() !== '');
      if (!allNumbers) {
        toast.error('Rent decision options must be numbers (monthly rent amounts)');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await daoAPI.createProposal({
        property_id: parseInt(formData.property_id),
        title: formData.title,
        description: formData.description,
        proposal_type: formData.proposal_type,
        options: finalOptions,
        min_quorum_percent: formData.min_quorum_percent,
        created_by_user_id: user.id,
      });

      toast.success('Proposal created successfully!');
      setIsCreateDialogOpen(false);
      setFormData({
        property_id: '',
        title: '',
        description: '',
        proposal_type: 'general',
        options: ['Yes', 'No', 'Abstain'],
        min_quorum_percent: 10,
      });
      setCustomOptions(['']);
      setUseCustomOptions(false);
      loadData();
    } catch (error: any) {
      console.error('Failed to create proposal:', error);
      toast.error(error.message || 'Failed to create proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomOption = () => {
    setCustomOptions([...customOptions, '']);
  };

  const removeCustomOption = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const updateCustomOption = (index: number, value: string) => {
    const newOptions = [...customOptions];
    newOptions[index] = value;
    setCustomOptions(newOptions);
  };

  const handleVote = async () => {
    if (!user || !selectedProposal || !selectedOption) return;

    try {
      setIsSubmitting(true);
      
      // Find the index of the selected option
      const optionIndex = selectedProposal.options_json.indexOf(selectedOption);
      if (optionIndex === -1) {
        toast.error('Invalid option selected');
        return;
      }
      
      await daoAPI.castVote(selectedProposal.id, user.id, optionIndex);
      toast.success('Vote cast successfully!');
      setIsVoteDialogOpen(false);
      setSelectedProposal(null);
      setSelectedOption('');
      loadData();
    } catch (error: any) {
      console.error('Failed to cast vote:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openVoteDialog = (proposal: DaoProposal) => {
    setSelectedProposal(proposal);
    setSelectedOption('');
    setIsVoteDialogOpen(true);
  };

  const handleCloseProposal = async (proposalId: number) => {
    try {
      await daoAPI.closeProposal(proposalId);
      toast.success('Proposal closed successfully!');
      loadData();
    } catch (error: any) {
      console.error('Failed to close proposal:', error);
      toast.error(error.message || 'Failed to close proposal');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPropertyName = (propertyId: number) => {
    return userProperties.find(p => p.property_id === propertyId)?.property_name || `Property #${propertyId}`;
  };

  const draftProposals = proposals.filter(p => p.status === 'draft');
  const activeProposals = proposals.filter(p => p.status === 'active');
  const closedProposals = proposals.filter(p => p.status === 'closed');

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view DAO proposals</h2>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">DAO Governance</h1>
            <p className="text-muted-foreground">
              Vote on property decisions with your token holdings
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Proposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Proposal</DialogTitle>
                <DialogDescription>
                  Create a proposal for token holders to vote on
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="property">Property *</Label>
                  <Select value={formData.property_id} onValueChange={(value) => setFormData({ ...formData, property_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                      {userProperties.map((prop) => (
                        <SelectItem key={prop.property_id} value={prop.property_id.toString()}>
                          {prop.property_name} ({prop.tokens} tokens)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Should we renovate the lobby?"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about the proposal..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Proposal Type</Label>
                  <Select 
                    value={formData.proposal_type} 
                    onValueChange={(value) => {
                      setFormData({ ...formData, proposal_type: value });
                      // Reset to custom options for rent decisions
                      if (value === 'rent_decision') {
                        setUseCustomOptions(true);
                        setCustomOptions(['1000', '1500', '2000']);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="property_upgrade">Property Upgrade</SelectItem>
                      <SelectItem value="rent_decision">Rent Decision (Monthly Rent)</SelectItem>
                      <SelectItem value="rent_adjustment">Rent Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.proposal_type === 'rent_decision' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Options should be monthly rent amounts in USD (numbers only)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quorum">Minimum Quorum (%)</Label>
                  <Input
                    id="quorum"
                    type="number"
                    value={formData.min_quorum_percent}
                    onChange={(e) => setFormData({ ...formData, min_quorum_percent: parseFloat(e.target.value) })}
                    min="0"
                    max="100"
                  />
                </div>

                {/* Custom Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Voting Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUseCustomOptions(!useCustomOptions)}
                    >
                      {useCustomOptions ? 'Use Default' : 'Customize Options'}
                    </Button>
                  </div>

                  {!useCustomOptions ? (
                    <div className="text-sm text-muted-foreground">
                      Default: Yes, No, Abstain
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateCustomOption(index, e.target.value)}
                          />
                          {customOptions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCustomOption(index)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomOption}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Option
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProposal} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Proposal'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading proposals...</p>
          </div>
        ) : (
          <Tabs defaultValue="draft" className="space-y-6">
            <TabsList>
              <TabsTrigger value="draft">
                Draft ({draftProposals.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeProposals.length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({closedProposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="draft" className="space-y-4">
              {draftProposals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No draft proposals</p>
                    <p className="text-sm text-muted-foreground">
                      Draft proposals are newly created and not yet open for voting.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                draftProposals.map((proposal) => {
                  const results = proposalResults[proposal.id];
                  return (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(proposal.status)}
                              <Badge variant="outline">{proposal.proposal_type}</Badge>
                            </div>
                            <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                            <CardDescription>
                              {getPropertyName(proposal.property_id)} • Created {new Date(proposal.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm">{proposal.description}</p>

                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Voting Options:</p>
                          <div className="flex flex-wrap gap-2">
                            {proposal.options_json.map((option) => (
                              <Badge key={option} variant="secondary">{option}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <p>This proposal is in draft status and not yet open for voting.</p>
                          <p className="mt-1">Minimum quorum: {proposal.min_quorum_percent}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeProposals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">No active proposals</p>
                    {userProperties.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        You need to own tokens in a property to see and vote on proposals.
                        <br />
                        <a href="/marketplace" className="text-primary hover:underline">
                          Browse properties to invest
                        </a>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No proposals have been created for your properties yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                activeProposals.map((proposal) => {
                  const results = proposalResults[proposal.id];
                  return (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(proposal.status)}
                              <Badge variant="outline">{proposal.proposal_type}</Badge>
                            </div>
                            <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                            <CardDescription>
                              {getPropertyName(proposal.property_id)} • Created {new Date(proposal.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm">{proposal.description}</p>

                        {results && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Participation</span>
                              <span className="font-medium">
                                {results.votes_cast} / {results.total_tokens} tokens ({((results.votes_cast / results.total_tokens) * 100).toFixed(1)}%)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              {results.quorum_reached ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                  <span className="text-success">Quorum reached</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 text-warning" />
                                  <span className="text-warning">Quorum not reached ({proposal.min_quorum_percent}% required)</span>
                                </>
                              )}
                            </div>

                            <div className="space-y-2 mt-4">
                              {results.results.map((result) => (
                                <div key={result.option} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>{result.option}</span>
                                    <span className="font-medium">{result.votes} votes ({result.percentage.toFixed(1)}%)</span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all"
                                      style={{ width: `${result.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={() => openVoteDialog(proposal)} className="flex-1">
                            <Vote className="mr-2 h-4 w-4" />
                            Cast Vote
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleCloseProposal(proposal.id)}
                            className="flex-1"
                          >
                            Close Voting
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="closed" className="space-y-4">
              {closedProposals.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Vote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No closed proposals</p>
                  </CardContent>
                </Card>
              ) : (
                closedProposals.map((proposal) => {
                  const results = proposalResults[proposal.id];
                  return (
                    <Card key={proposal.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusBadge(proposal.status)}
                              <Badge variant="outline">{proposal.proposal_type}</Badge>
                              {results?.winning_option && (
                                <Badge className="bg-success text-success-foreground">
                                  Winner: {results.winning_option}
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                            <CardDescription>
                              {getPropertyName(proposal.property_id)} • Created {new Date(proposal.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm">{proposal.description}</p>

                        {results && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Final Results</span>
                              <span className="font-medium">
                                {results.votes_cast} / {results.total_tokens} tokens
                              </span>
                            </div>

                            <div className="space-y-2 mt-4">
                              {results.results.map((result) => (
                                <div key={result.option} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>{result.option}</span>
                                    <span className="font-medium">{result.votes} votes ({result.percentage.toFixed(1)}%)</span>
                                  </div>
                                  <div className="w-full bg-secondary rounded-full h-2">
                                    <div
                                      className="bg-primary rounded-full h-2 transition-all"
                                      style={{ width: `${result.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Vote Dialog */}
      <Dialog open={isVoteDialogOpen} onOpenChange={setIsVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              {selectedProposal?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedProposal?.description}
            </p>

            <div>
              <Label>Select your vote</Label>
              <Select value={selectedOption} onValueChange={setSelectedOption}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProposal?.options_json.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProposal && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Your vote weight will be based on your current token holdings in this property.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVote} disabled={!selectedOption || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

