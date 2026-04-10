import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type UploadResult = {
  storageId: Id<"_storage">;
};

export default function App() {
  const images = useQuery(api.gallery.listImages);
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const createImageEntry = useMutation(api.gallery.createImageEntry);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isFormValid = title.trim() !== "" && caption.trim() !== "" && selectedFile;
  const helperText = useMemo(() => {
    if (selectedFile) {
      return `Selected image: ${selectedFile.name}`;
    }

    return "Choose an image file to add to the gallery.";
  }, [selectedFile]);

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setSelectedFile(null);
    setErrorMessage("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMessage("Please choose an image before uploading.");
      return;
    }

    if (!title.trim() || !caption.trim()) {
      setErrorMessage("Please add both a title and a caption.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": selectedFile.type || "application/octet-stream",
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Image upload failed.");
      }

      const { storageId } = (await uploadResponse.json()) as UploadResult;

      await createImageEntry({
        storageId,
        title,
        caption,
      });

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while uploading the image.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(26,115,232,0.18), transparent 26%), radial-gradient(circle at top right, rgba(217,48,37,0.14), transparent 24%), linear-gradient(180deg, #e8f0fe 0%, #f5f9ff 42%, #edf4ff 100%)",
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: "rgba(248, 251, 255, 0.88)",
          color: "text.primary",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(26, 115, 232, 0.12)",
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" sx={{ letterSpacing: "-0.02em", fontWeight: 700 }}>
              Jayden Gallery
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload moments and stories into a live Convex gallery.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsDialogOpen(true)}
            sx={{
              px: 3,
              py: 1.25,
              boxShadow: "0 8px 24px rgba(26,115,232,0.18)",
              "&:hover": {
                boxShadow: "0 10px 28px rgba(26,115,232,0.24)",
              },
            }}
          >
            Upload Image
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              border: "1px solid rgba(26, 115, 232, 0.12)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(232,240,254,0.96))",
              boxShadow: "0 24px 48px rgba(26,115,232,0.08)",
            }}
          >
            <Stack spacing={2}>
              <Typography variant="h2" sx={{ fontSize: { xs: "2.4rem", md: "4rem" } }}>
                A home for your images and the words behind them.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 760 }}>
                Every upload is stored in Convex and appears instantly in this
                gallery with its title and caption.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 99,
                    bgcolor: "rgba(26,115,232,0.10)",
                    color: "primary.main",
                    fontWeight: 600,
                    width: "fit-content",
                  }}
                >
                  Light blue live gallery
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: 99,
                    bgcolor: "rgba(217,48,37,0.10)",
                    color: "secondary.main",
                    fontWeight: 600,
                    width: "fit-content",
                  }}
                >
                  Blue and red Google-inspired UI
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {images === undefined ? (
            <Stack spacing={2} sx={{ py: 10, alignItems: "center" }}>
              <CircularProgress color="primary" />
              <Typography color="text.secondary">
                Loading your gallery...
              </Typography>
            </Stack>
          ) : images.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: "center",
                borderStyle: "dashed",
                borderWidth: 1,
                borderColor: "rgba(26, 115, 232, 0.28)",
                backgroundColor: "rgba(248, 251, 255, 0.86)",
              }}
            >
              <Typography variant="h4" gutterBottom>
                Your gallery is ready.
              </Typography>
              <Typography color="text.secondary">
                Use the upload button at the top to add the first image with a
                title and caption.
              </Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 3,
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {images.map((image) => (
                <Card
                  key={image._id}
                  elevation={0}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: "1px solid rgba(26, 115, 232, 0.12)",
                    backgroundColor: "rgba(248, 251, 255, 0.96)",
                    boxShadow: "0 12px 32px rgba(26,115,232,0.10)",
                    transition: "transform 180ms ease, box-shadow 180ms ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 18px 40px rgba(26,115,232,0.14)",
                    },
                  }}
                >
                  {image.imageUrl ? (
                    <CardMedia
                      component="img"
                      image={image.imageUrl}
                      alt={image.title}
                      sx={{ height: 260, objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 260,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(26, 115, 232, 0.08)",
                      }}
                    >
                      <Typography color="text.secondary">
                        Image unavailable
                      </Typography>
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1.5}>
                      <Typography variant="h5">{image.title}</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {image.caption}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(image._creationTime))}
                      </Typography>
                      <Box
                        sx={{
                          width: 44,
                          height: 4,
                          borderRadius: 999,
                          bgcolor: "secondary.main",
                        }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Stack>
      </Container>

      <Dialog
        open={isDialogOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              backgroundImage:
                "linear-gradient(180deg, rgba(248,251,255,1), rgba(232,240,254,0.96))",
              border: "1px solid rgba(26,115,232,0.12)",
            },
          },
        }}
      >
        <DialogTitle>Upload an image</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            <Button variant="outlined" component="label" sx={{ alignSelf: "flex-start" }}>
              Choose Image
              <input
                hidden
                accept="image/*"
                type="file"
                onChange={handleFileChange}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {helperText}
            </Typography>
            <TextField
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            onClick={() => {
              void handleSubmit();
            }}
          >
            {isSubmitting ? "Uploading..." : "Publish to Gallery"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
