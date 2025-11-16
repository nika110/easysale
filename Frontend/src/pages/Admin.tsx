import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  Users,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { propertyAPI, Property } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { RentProposalsSection } from "@/components/RentProposalsSection";

const Admin = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    price: "",
    yield: "",
    image: "",
    description: "",
    project_id: "",
    project_name: "",
    apartment_name: "",
    floor: "",
    total_sqm: "",
    bedroom_sqm: "",
    bathroom_sqm: "",
    balcony_sqm: "",
    bedrooms: "",
    bathrooms: "",
  });

  // Load properties from backend
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setIsLoading(true);
      const response = await propertyAPI.list();
      setProperties(response.items || []);
    } catch (error) {
      console.error("Failed to load properties:", error);
      toast({
        title: "Error",
        description: "Failed to load properties. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddProperty = async () => {
    try {
      setIsSubmitting(true);

      // Validate form
      if (!formData.name || !formData.location || !formData.price || !formData.yield) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Create property via API
      const newProperty = await propertyAPI.create({
        name: formData.name,
        location: formData.location,
        description: formData.description || `Beautiful property in ${formData.location}`,
        price_usd: parseInt(formData.price),
        expected_annual_yield_percent: parseFloat(formData.yield),
        image_url: formData.image || undefined,
        project_id: formData.project_id || undefined,
        project_name: formData.project_name || undefined,
        apartment_name: formData.apartment_name || undefined,
        floor: formData.floor ? parseInt(formData.floor) : undefined,
        total_sqm: formData.total_sqm ? parseFloat(formData.total_sqm) : undefined,
        bedroom_sqm: formData.bedroom_sqm ? parseFloat(formData.bedroom_sqm) : undefined,
        bathroom_sqm: formData.bathroom_sqm ? parseFloat(formData.bathroom_sqm) : undefined,
        balcony_sqm: formData.balcony_sqm ? parseFloat(formData.balcony_sqm) : undefined,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      });

      toast({
        title: "Success!",
        description: `Property "${newProperty.name}" created successfully with blockchain contract!`,
      });

      // Reload properties
      await loadProperties();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to create property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProperty = async () => {
    if (!selectedProperty) return;

    try {
      setIsSubmitting(true);

      await propertyAPI.update(selectedProperty.id, {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        expected_annual_yield_percent: parseFloat(formData.yield),
        image_url: formData.image || undefined,
      });

      toast({
        title: "Success!",
        description: "Property updated successfully",
      });

      await loadProperties();
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Failed to update property:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = (id: number) => {
    toast({
      title: "Not Implemented",
      description: "Delete functionality coming soon",
    });
  };

  const openEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      name: property.name,
      location: property.location,
      price: property.price_usd.toString(),
      yield: property.expected_annual_yield_percent.toString(),
      image: property.image_url || "",
      description: property.description,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      price: "",
      yield: "",
      image: "",
      description: "",
      project_id: "",
      project_name: "",
      apartment_name: "",
      floor: "",
      total_sqm: "",
      bedroom_sqm: "",
      bathroom_sqm: "",
      balcony_sqm: "",
      bedrooms: "",
      bathrooms: "",
    });
    setSelectedProperty(null);
  };

  return (
    <div className="min-h-screen bg-background">      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage properties on the platform</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Properties</p>
                  <p className="text-2xl font-bold">{properties.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">$11.4M</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">29.6K</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Yield</p>
                  <p className="text-2xl font-bold">4.4%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rent Proposals Section */}
        <div className="mb-8">
          <RentProposalsSection />
        </div>

        {/* Properties Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Properties</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No properties yet. Click "Add Property" to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {property.location}
                        </div>
                      </TableCell>
                      <TableCell>${property.price_usd.toLocaleString()}</TableCell>
                      <TableCell>
                        {property.tokens_sold.toLocaleString()}/{property.total_tokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-success">
                        {property.expected_annual_yield_percent}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.status === "funded" ? "default" : "secondary"}>
                          {property.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {property.token_contract_address ? (
                          <Badge variant="outline" className="text-xs">
                            {property.token_contract_address.slice(0, 6)}...
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(property)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Property Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new property to the marketplace
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Luxury Penthouse Manhattan"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="New York, USA"
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Total Price (USD) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="500000"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tokens = Price (1 token = $1)
              </p>
            </div>

            <div>
              <Label htmlFor="yield">Annual Yield (%) *</Label>
              <Input
                id="yield"
                name="yield"
                type="number"
                step="0.1"
                value={formData.yield}
                onChange={handleInputChange}
                placeholder="8.5"
                required
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="image">Image URL (optional)</Label>
              <Input
                id="image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://example.com/property.jpg"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Beautiful property with amazing features..."
                rows={4}
              />
            </div>

            {/* Additional Property Details */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h3 className="font-semibold mb-3">Additional Details (Optional)</h3>
            </div>

            <div>
              <Label htmlFor="project_id">Project ID</Label>
              <Input
                id="project_id"
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                placeholder="PROJ-001"
              />
            </div>

            <div>
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                name="project_name"
                value={formData.project_name}
                onChange={handleInputChange}
                placeholder="Downtown Plaza"
              />
            </div>

            <div>
              <Label htmlFor="apartment_name">Apartment Name</Label>
              <Input
                id="apartment_name"
                name="apartment_name"
                value={formData.apartment_name}
                onChange={handleInputChange}
                placeholder="Unit 101"
              />
            </div>

            <div>
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                name="floor"
                type="number"
                value={formData.floor}
                onChange={handleInputChange}
                placeholder="5"
              />
            </div>

            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={handleInputChange}
                placeholder="3"
              />
            </div>

            <div>
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={handleInputChange}
                placeholder="2"
              />
            </div>

            <div>
              <Label htmlFor="total_sqm">Total Area (sqm)</Label>
              <Input
                id="total_sqm"
                name="total_sqm"
                type="number"
                step="0.01"
                value={formData.total_sqm}
                onChange={handleInputChange}
                placeholder="120.5"
              />
            </div>

            <div>
              <Label htmlFor="bedroom_sqm">Bedroom Area (sqm)</Label>
              <Input
                id="bedroom_sqm"
                name="bedroom_sqm"
                type="number"
                step="0.01"
                value={formData.bedroom_sqm}
                onChange={handleInputChange}
                placeholder="45.0"
              />
            </div>

            <div>
              <Label htmlFor="bathroom_sqm">Bathroom Area (sqm)</Label>
              <Input
                id="bathroom_sqm"
                name="bathroom_sqm"
                type="number"
                step="0.01"
                value={formData.bathroom_sqm}
                onChange={handleInputChange}
                placeholder="15.0"
              />
            </div>

            <div>
              <Label htmlFor="balcony_sqm">Balcony Area (sqm)</Label>
              <Input
                id="balcony_sqm"
                name="balcony_sqm"
                type="number"
                step="0.01"
                value={formData.balcony_sqm}
                onChange={handleInputChange}
                placeholder="10.0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProperty}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Add Property"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property details
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit-name">Property Name</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Luxury Penthouse Manhattan"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="New York, USA"
              />
            </div>

            <div>
              <Label htmlFor="edit-price">Total Price ($)</Label>
              <Input
                id="edit-price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="2400000"
              />
            </div>

            <div>
              <Label htmlFor="edit-tokenPrice">Token Price ($)</Label>
              <Input
                id="edit-tokenPrice"
                name="tokenPrice"
                type="number"
                value={formData.tokenPrice}
                onChange={handleInputChange}
                placeholder="250"
              />
            </div>

            <div>
              <Label htmlFor="edit-totalTokens">Total Tokens</Label>
              <Input
                id="edit-totalTokens"
                name="totalTokens"
                type="number"
                value={formData.totalTokens}
                onChange={handleInputChange}
                placeholder="9600"
              />
            </div>

            <div>
              <Label htmlFor="edit-availableTokens">Available Tokens</Label>
              <Input
                id="edit-availableTokens"
                name="availableTokens"
                type="number"
                value={formData.availableTokens}
                onChange={handleInputChange}
                placeholder="7200"
              />
            </div>

            <div>
              <Label htmlFor="edit-yield">Annual Yield (%)</Label>
              <Input
                id="edit-yield"
                name="yield"
                type="number"
                step="0.1"
                value={formData.yield}
                onChange={handleInputChange}
                placeholder="4.2"
              />
            </div>

            <div>
              <Label htmlFor="edit-type">Property Type</Label>
              <Input
                id="edit-type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Residential"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-image">Image URL</Label>
              <Input
                id="edit-image"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the property..."
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProperty}>
              Update Property
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
