import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { daoAPI, DaoProposal, DaoProposalResult } from '@/lib/api';
import { CheckCircle, Home, DollarSign, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export function RentProposalsSection() {
  const [rentProposals, setRentProposals] = useState<DaoProposal[]>([]);
  const [proposalResults, setProposalResults] = useState<Record<number, DaoProposalResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  useEffect(() => {
    loadRentProposals();
  }, []);

  const loadRentProposals = async () => {
    try {
      setIsLoading(true);
      // Get closed rent proposals (decided by DAO, waiting for admin action)
      const proposals = await daoAPI.getRentProposals('closed');
      setRentProposals(proposals);

      // Load results for each proposal
      const results: Record<number, DaoProposalResult> = {};
      for (const proposal of proposals) {
        try {
          const result = await daoAPI.getProposalResults(proposal.id);
          results[proposal.id] = result;
        } catch (error) {
          console.error(`Failed to load results for proposal ${proposal.id}:`, error);
        }
      }
      setProposalResults(results);
    } catch (error) {
      console.error('Failed to load rent proposals:', error);
      toast.error('Failed to load rent proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (proposalId: number) => {
    try {
      setApprovingId(proposalId);
      await daoAPI.approveProposal(proposalId);
      toast.success('Rent proposal approved! Property marked as rented.');
      loadRentProposals(); // Reload to remove from list
    } catch (error: any) {
      console.error('Failed to approve proposal:', error);
      toast.error(error.message || 'Failed to approve proposal');
    } finally {
      setApprovingId(null);
    }
  };

  const getWinningOption = (proposalId: number) => {
    const result = proposalResults[proposalId];
    return result?.winning_option || 'N/A';
  };

  const getVotePercentage = (proposalId: number) => {
    const result = proposalResults[proposalId];
    if (!result || result.total_tokens === 0) return '0%';
    return `${((result.votes_cast / result.total_tokens) * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading rent proposals...</p>
        </CardContent>
      </Card>
    );
  }

  if (rentProposals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Rent Proposals
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No rent proposals pending approval</p>
          <p className="text-sm text-muted-foreground mt-2">
            Rent proposals will appear here after DAO voting is complete
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Rent Proposals Awaiting Action
          </CardTitle>
          <Badge variant="secondary">{rentProposals.length} Pending</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          These properties have completed DAO voting for rent decisions. Find renters and approve to mark as rented.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Proposal</TableHead>
              <TableHead>DAO Decision</TableHead>
              <TableHead>Participation</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rentProposals.map((proposal) => {
              const result = proposalResults[proposal.id];
              const winningOption = result?.winning_option || 'N/A';
              
              return (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <div className="font-medium">Property #{proposal.property_id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium">{proposal.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {proposal.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-success" />
                      <span className="font-semibold text-success">{winningOption}</span>
                    </div>
                    {result && result.quorum_reached && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Quorum Reached
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getVotePercentage(proposal.id)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(proposal.id)}
                      disabled={approvingId === proposal.id}
                    >
                      {approvingId === proposal.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Rented
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

